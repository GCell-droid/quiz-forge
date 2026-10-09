import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  QuizSession,
  SessionStatus,
} from '../entities/quiz-session.entity/quiz-session.entity';
import { Page, PageOptions, toPage } from '../../common/pagination';

export function isSessionUuid(reference: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    reference,
  );
}

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(QuizSession)
    private readonly sessions: Repository<QuizSession>,
  ) {}

  findByReference(reference: string): Promise<QuizSession | null> {
    const where = isSessionUuid(reference)
      ? { sessionId: reference }
      : { joinCode: reference };
    return this.sessions.findOne({ where, relations: ['quiz', 'createdBy'] });
  }

  findByIdWithCreator(sessionId: string): Promise<QuizSession | null> {
    return this.sessions.findOne({
      where: { sessionId },
      relations: ['createdBy'],
    });
  }

  findByIdWithQuiz(sessionId: string): Promise<QuizSession | null> {
    return this.sessions.findOne({
      where: { sessionId },
      relations: ['quiz'],
    });
  }

  findByIdForLifecycle(sessionId: string): Promise<QuizSession | null> {
    return this.sessions.findOne({
      where: { sessionId },
      relations: ['quiz', 'createdBy'],
    });
  }

  async findHostedBy(
    userId: string,
    options: PageOptions,
  ): Promise<Page<QuizSession>> {
    const [items, total] = await this.sessions.findAndCount({
      where: { createdBy: { uid: userId } },
      relations: ['quiz'],
      order: {
        scheduledStart: 'DESC',
        sessionId: 'DESC',
      },
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
    });
    return toPage(items, total, options);
  }

  createScheduled(data: Partial<QuizSession>): Promise<QuizSession> {
    return this.sessions.save(this.sessions.create(data));
  }

  save(session: QuizSession): Promise<QuizSession> {
    return this.sessions.save(session);
  }

  async markCompleted(sessionId: string): Promise<void> {
    await this.sessions.update(
      { sessionId },
      { status: SessionStatus.COMPLETED, endTime: new Date() },
    );
  }
}
