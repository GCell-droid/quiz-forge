import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizSession, SessionStatus } from '../entities/quiz-session.entity/quiz-session.entity';
import { QuizzesService } from '../../quizzes/quizzes.service';
import { RedisService } from '../../redis/redis.service';
import { SessionGateway } from '../events/session/session.gateway';

@Processor('quiz-lifecycle')
@Injectable()
export class QuizLifecycleProcessor extends WorkerHost {
  constructor(
    @InjectRepository(QuizSession)
    private readonly sessionRepo: Repository<QuizSession>,
    private readonly quizzesService: QuizzesService,
    private readonly redisService: RedisService,
    private readonly sessionGateway: SessionGateway,
  ) {
    super();
  }

  async process(job: Job<{ sessionId: string }>): Promise<void> {
    const { sessionId } = job.data;
    
    // Fetch the session
    const session = await this.sessionRepo.findOne({
      where: { sessionId },
      relations: ['quiz', 'createdBy'],
    });
    
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (job.name === 'pre-warm') {
      // 1. Fetch complete quiz structure including questions from DB
      const quiz = await this.quizzesService.getQuiz(session.quiz.quizId);
      
      // 2. Cache in Redis (e.g. stringified quiz metadata, valid for 1 hour)
      const cacheKey = `quiz:session:${sessionId}:metadata`;
      await this.redisService.set(cacheKey, JSON.stringify(quiz), 3600);
      
      // Cache session details
      const sessionDetails = {
        sessionId: session.sessionId,
        joinCode: session.joinCode,
        creatorId: session.createdBy?.uid,
        status: SessionStatus.SCHEDULED,
        timeLimit: session.timeLimit,
        scheduledStart: session.scheduledStart,
        actualStart: session.actualStart,
        endTime: session.endTime,
        quizId: session.quiz?.quizId,
      };
      await this.redisService.set(`quiz:session:${sessionId}:details`, JSON.stringify(sessionDetails), 3600);
      await this.redisService.set(`quiz:session:code:${session.joinCode}`, session.sessionId, 3600);
      
      // Also cache status as SCHEDULED for consistency
      await this.redisService.set(`quiz:session:${sessionId}:status`, SessionStatus.SCHEDULED, 3600);
      
      console.log(`[Pre-warmer] Cached quiz metadata for session: ${sessionId}`);
    } else if (job.name === 'go-live') {
      // 1. Update session status to ACTIVE in database
      session.status = SessionStatus.ACTIVE;
      session.actualStart = new Date();
      await this.sessionRepo.save(session);

      // 2. Update status in Redis
      await this.redisService.set(`quiz:session:${sessionId}:status`, SessionStatus.ACTIVE, 3600);
      
      // Update session details in Redis
      const detailsStr = await this.redisService.get(`quiz:session:${sessionId}:details`);
      if (detailsStr) {
        const details = JSON.parse(detailsStr);
        details.status = SessionStatus.ACTIVE;
        details.actualStart = session.actualStart;
        await this.redisService.set(`quiz:session:${sessionId}:details`, JSON.stringify(details), 3600);
      }

      // 3. Broadcast go-live event to students in the websocket room
      // Get cached quiz metadata, or fetch from DB if fallback is needed
      const cacheKey = `quiz:session:${sessionId}:metadata`;
      const quizData = await this.redisService.get(cacheKey);
      let quiz = quizData ? JSON.parse(quizData) : null;
      if (!quiz) {
        quiz = await this.quizzesService.getQuiz(session.quiz.quizId);
      }

      this.sessionGateway.broadcastToSession(sessionId, 'quiz_started', {
        sessionId,
        quizTitle: quiz.title,
        questions: quiz.quizQuestions?.map((qq: any) => ({
          questionId: qq.question.questionId,
          title: qq.question.title,
          type: qq.question.type,
          options: qq.question.options,
          points: qq.question.points,
        })) || [],
        totalQuestions: quiz.quizQuestions?.length || 0,
        timeLimit: session.timeLimit,
      });

      console.log(`[Go-Live] Started session: ${sessionId} and broadcasted event`);
    } else if (job.name === 'end-session') {
      // 1. Update session status to COMPLETED in database
      session.status = SessionStatus.COMPLETED;
      session.endTime = new Date();
      await this.sessionRepo.save(session);

      // 2. Remove active status from Redis
      await this.redisService.del(`quiz:session:${sessionId}:status`);
      
      // Update session details in Redis
      const detailsStr = await this.redisService.get(`quiz:session:${sessionId}:details`);
      if (detailsStr) {
        const details = JSON.parse(detailsStr);
        details.status = SessionStatus.COMPLETED;
        details.endTime = session.endTime;
        await this.redisService.set(`quiz:session:${sessionId}:details`, JSON.stringify(details), 3600);
      }
      
      // 3. Inform all clients the session has ended
      this.sessionGateway.broadcastToSession(sessionId, 'session_ended', {
        message: 'Time is up! The session has concluded.',
      });

      // 4. Terminate sockets gracefully by giving them time to receive the message
      setTimeout(() => {
        this.sessionGateway.server.in(`session_${sessionId}`).disconnectSockets(true);
      }, 3000);

      console.log(`[End-Session] Automatically terminated session: ${sessionId}`);
    }
  }
}
