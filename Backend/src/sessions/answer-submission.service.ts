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

export interface SubmitAnswerCommand {
  sessionId: string;
  questionId: string;
  userId: string;
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

    let sessionStatus: string | undefined;
    let creatorId: string | undefined;

    const cachedDetailsStr = await this.redisService.get(
      `quiz:session:${sessionId}:details`,
    );

    if (cachedDetailsStr) {
      try {
        const details = JSON.parse(cachedDetailsStr);
        sessionStatus = details.status;
        creatorId = details.creatorId;
      } catch {
        // Fall back to database on parse failure
      }
    }

    if (!sessionStatus) {
      const session = await this.sessionRepo.findByIdWithCreator(sessionId);
      if (!session) throw new NotFoundException('Session not found');
      sessionStatus = session.status;
      creatorId = session.createdBy?.uid;
    }

    if (sessionStatus !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Session is not active');
    }
    if (creatorId === userId) {
      throw new ForbiddenException('Creators cannot submit answers');
    }

    const currentQuestion = await this.sessionsService.getNextQuestionForUser(
      sessionId,
      userId,
    );
    if (!currentQuestion || currentQuestion.questionId !== questionId) {
      throw new BadRequestException(
        'Question is not the next unanswered question',
      );
    }

    await this.answerQueue.enqueue(command);
    await this.redisService.sadd(
      `quiz:session:${sessionId}:answered:${userId}`,
      questionId,
    );
    const nextQuestion = await this.sessionsService.getNextQuestionForUser(
      sessionId,
      userId,
    );
    return { nextQuestion };
  }
}
