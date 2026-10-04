import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { QuizSession } from '../entities/quiz-session.entity/quiz-session.entity';
import User from '../../common/entity/user.entity';
import { RedisService } from '../../redis/redis.service';
import { QuizzesService } from '../../quizzes/quizzes.service';

import { ANSWER_SCORER } from '../ports/answer-scoring.port';
import type { AnswerScorer } from '../ports/answer-scoring.port';
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
  private quizCache = new Map<string, { quiz: any; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60 * 1000;

  constructor(
    private readonly responseRepo: ResponseRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly userRepo: UserRepository,
    private readonly redisService: RedisService,
    private readonly quizzesService: QuizzesService,
    @Inject(ANSWER_SCORER) private readonly answerScorer: AnswerScorer,
    @Inject(SESSION_EVENTS) private readonly sessionEvents: SessionEvents,
  ) {
    super();
  }

  async process(job: Job<AnswerJob>): Promise<void> {
    const { sessionId, questionId, userId, response, timeTakenSecs } = job.data;

    // 1. Load Quiz details to verify the correct answer.
    // Try in-memory cache first to eliminate repeated Redis calls and JSON parses
    let quiz: any;
    const cachedMemory = this.quizCache.get(sessionId);
    if (cachedMemory && cachedMemory.expiresAt > Date.now()) {
      quiz = cachedMemory.quiz;
    } else {
      const cacheKey = `quiz:session:${sessionId}:metadata`;
      const cachedQuizData = await this.redisService.get(cacheKey);

      if (cachedQuizData) {
        try {
          quiz = JSON.parse(cachedQuizData);
          this.quizCache.set(sessionId, {
            quiz,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
          });
        } catch {
          // Fall back if parse fails
        }
      }

      if (!quiz) {
        // Fallback: Fetch session and then quiz from DB
        const session = await this.sessionRepo.findByIdWithQuiz(sessionId);
        if (!session) {
          throw new NotFoundException(`Session ${sessionId} not found`);
        }
        quiz = await this.quizzesService.getQuiz(session.quiz.quizId);
        if (quiz) {
          this.quizCache.set(sessionId, {
            quiz,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
          });
        }
      }
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
    const { isCorrect, pointsScored } = this.answerScorer.score(
      question,
      response,
    );

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
