import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionStatus } from './entities/quiz-session.entity/quiz-session.entity';
import { ANSWER_QUEUE } from './ports/answer-queue.port';
import type { AnswerQueue } from './ports/answer-queue.port';
import { RedisService } from '../redis/redis.service';
import { SessionsService } from './sessions.service';
import { SessionRepository } from './repositories/session.repository';
import { isSessionExpired } from './utils/session.util';

export interface SubmitAnswerCommand {
  sessionId: string;
  questionId: string;
  userId: string;
  userName?: string;
  response: string;
  timeTakenSecs: number;
}

@Injectable()
export class AnswerSubmissionService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly sessionsService: SessionsService,
    private readonly redisService: RedisService,
    @Inject(ANSWER_QUEUE) private readonly answerQueue: AnswerQueue,
  ) {}

  async submit(
    command: SubmitAnswerCommand,
    options?: { returnNextQuestion?: boolean; expectedQuestionId?: string },
  ): Promise<{ nextQuestion: unknown | null }> {
    const { sessionId, questionId, userId, response, timeTakenSecs } = command;
    if (
      !sessionId ||
      !questionId ||
      typeof response !== 'string' ||
      response.trim().length === 0 ||
      !Number.isFinite(timeTakenSecs) ||
      timeTakenSecs < 0
    ) {
      throw new BadRequestException('Invalid answer');
    }

    const cachedDetailsStr = await this.redisService.get(`quiz:session:${sessionId}:details`);
    let details = cachedDetailsStr ? JSON.parse(cachedDetailsStr) : null;

    if (!details) {
      const session = await this.sessionRepo.findByIdWithCreator(sessionId);
      if (!session) throw new NotFoundException('Session not found');
      
      details = {
        status: session.status,
        creatorId: session.createdBy?.uid,
        actualStart: session.actualStart,
        scheduledStart: session.scheduledStart,
        timeLimit: session.timeLimit,
      };
    }

    const {
      status: sessionStatus,
      creatorId,
      actualStart,
      scheduledStart,
      timeLimit
    } = details;

    const isExpired = isSessionExpired({
      status: sessionStatus as SessionStatus,
      actualStart,
      scheduledStart,
      timeLimit: timeLimit || 0,
    });

    if (isExpired) {
      await Promise.all([
        this.redisService.del(`quiz:session:${sessionId}:status`),
        this.sessionRepo.markCompleted(sessionId),
      ]);
      throw new BadRequestException('Session has ended');
    }

    if (sessionStatus !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Session is not active');
    }
    if (creatorId === userId) {
      throw new ForbiddenException('Creators cannot submit answers');
    }

    // Fast path: if the active connection tracks the expected question,
    // validate directly in memory without hitting Redis (0ms, 0 Redis calls!)
    if (options?.expectedQuestionId) {
      if (options.expectedQuestionId !== questionId) {
        throw new BadRequestException(
          'Question is not the next unanswered question',
        );
      }
    } else {
      const currentQuestion = await this.sessionsService.getNextQuestionForUser(
        sessionId,
        userId,
      );
      if (!currentQuestion || currentQuestion.questionId !== questionId) {
        throw new BadRequestException(
          'Question is not the next unanswered question',
        );
      }
    }

    await this.answerQueue.enqueue(command);
    await this.redisService.sadd(
      `quiz:session:${sessionId}:answered:${userId}`,
      questionId,
    );

    let nextQuestion: unknown | null = null;
    if (options?.returnNextQuestion !== false) {
      nextQuestion = await this.sessionsService.getNextQuestionAfter(
        sessionId,
        questionId,
        userId,
      );
    }
    return { nextQuestion };
  }
}
