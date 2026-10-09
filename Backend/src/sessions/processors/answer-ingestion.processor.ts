import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QuizSession } from '../entities/quiz-session.entity/quiz-session.entity';
import User from '../../common/entity/user.entity';
import { RedisService } from '../../redis/redis.service';
import { QuizzesService } from '../../quizzes/quizzes.service';

import { scoreAnswer } from '../utils/scoring.util';
import { AnswerJob } from '../ports/answer-queue.port';
import { SESSION_EVENTS } from '../ports/session-events.port';
import type { SessionEvents } from '../ports/session-events.port';
import { Question } from '../../quizzes/entities/question.entity/question.entity';
import { SessionRepository } from '../repositories/session.repository';
import { ResponseRepository } from '../repositories/response.repository';
import { UserRepository } from '../../common/repositories/user.repository';

@Processor('answer-ingestion')
@Injectable()
export class AnswerIngestionProcessor extends WorkerHost {
  constructor(
    private readonly responseRepo: ResponseRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly userRepo: UserRepository,
    private readonly redisService: RedisService,
    private readonly quizzesService: QuizzesService,
    @Inject(SESSION_EVENTS) private readonly sessionEvents: SessionEvents,
  ) {
    super();
  }

  async process(job: Job<AnswerJob>): Promise<void> {
    const { sessionId, questionId, userId, response, timeTakenSecs } = job.data;

    // Try Redis cache first to avoid DB hits
    const cacheKey = `quiz:session:${sessionId}:metadata`;
    const cachedQuizData = await this.redisService.get(cacheKey);
    let quiz = cachedQuizData ? JSON.parse(cachedQuizData) : null;

    if (!quiz) {
      // Fallback: Fetch session and then quiz from DB
      const session = await this.sessionRepo.findByIdWithQuiz(sessionId);
      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }
      quiz = await this.quizzesService.getQuiz(session.quiz.quizId);
    }

    // Find the question inside the quiz
    const quizQuestionBridge = quiz.quizQuestions.find(
      (qq: any) => qq.question.questionId === questionId,
    );

    if (!quizQuestionBridge) {
      throw new NotFoundException(
        `Question ${questionId} not found in this session's quiz`,
      );
    }

    const question = quizQuestionBridge.question;

    // 2. Evaluate answer correctness
    const { isCorrect, pointsScored } = scoreAnswer(question, response);

    // 3. Save QuestionResponse to database
    const questionResponse = this.responseRepo.create({
      session: { sessionId } as QuizSession,
      question: { questionId } as Question,
      user: { uid: userId } as User,
      response,
      isCorrect,
      pointsScored,
      timeTakenSecs,
    });

    try {
      await this.responseRepo.save(questionResponse);
      console.log(
        `[Answer Ingestion] Saved answer for user: ${userId}, question: ${questionId}, correct: ${isCorrect}`,
      );
    } catch (dbErr: any) {
      if (
        dbErr?.code === '23503' ||
        dbErr?.message?.includes('foreign key constraint')
      ) {
        // Virtual/benchmark user not registered in UserEntity table; skip persistent DB save
        console.warn(
          `[Answer Ingestion] Skipped DB save for virtual user: ${userId}`,
        );
      } else {
        throw dbErr;
      }
    }

    // 4. Fetch User to broadcast userName (Fast path: use userName provided in job data)
    let userName = job.data.userName;
    if (!userName) {
      const user = await this.userRepo.findById(userId);
      userName =
        user?.name || (user?.email ? user.email.split('@')[0] : 'Unknown');
    }

    const answerPayload = {
      questionId,
      userId,
      userName,
      response,
      timeTakenSecs,
      isCorrect,
      pointsScored,
    };

    // 5. Save to Redis for high-performance retrieval (initialStats)
    const answersKey = `quiz:session:${sessionId}:answers`;
    await this.redisService.hset(
      answersKey,
      `${userId}:${questionId}`,
      JSON.stringify(answerPayload),
    );

    // 6. Broadcast live_answer_submitted event to the room
    this.sessionEvents.answerSubmitted(sessionId, answerPayload);
  }
}
