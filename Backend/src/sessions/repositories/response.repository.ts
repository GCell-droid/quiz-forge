import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionResponse } from '../entities/question-response.entity/question-response.entity';
import { Page, PageOptions, toPage } from '../../common/pagination';

export interface StoredAnswer {
  questionId: string;
  response: string;
  isCorrect: boolean;
  pointsScored: number;
  timeTakenSecs: number;
}

export interface AnswerWithUser extends StoredAnswer {
  userId: string;
  userName: string | null;
  userEmail: string | null;
}

export interface SessionHistoryRow {
  sessionId: string;
  quizTitle: string;
  date: Date;
  score: number;
}

@Injectable()
export class ResponseRepository {
  constructor(
    @InjectRepository(QuestionResponse)
    private readonly responses: Repository<QuestionResponse>,
  ) {}

  async findForUser(
    sessionId: string,
    userId: string,
  ): Promise<StoredAnswer[]> {
    const responses = await this.responses.find({
      where: { session: { sessionId }, user: { uid: userId } },
      relations: ['question'],
    });

    return responses.map((r) => ({
      questionId: r.question.questionId,
      response: r.response,
      isCorrect: r.isCorrect,
      pointsScored: r.pointsScored,
      timeTakenSecs: r.timeTakenSecs,
    }));
  }

  async findQuestionIdsForUser(
    sessionId: string,
    userId: string,
  ): Promise<string[]> {
    const responses = await this.responses.find({
      where: { session: { sessionId }, user: { uid: userId } },
      relations: ['question'],
    });
    return responses.map((r) => r.question.questionId);
  }

  async findForSession(sessionId: string): Promise<AnswerWithUser[]> {
    const responses = await this.responses.find({
      where: { session: { sessionId } },
      relations: ['question', 'user'],
    });

    return responses.map((r) => ({
      questionId: r.question.questionId,
      response: r.response,
      isCorrect: r.isCorrect,
      pointsScored: r.pointsScored,
      timeTakenSecs: r.timeTakenSecs,
      userId: r.user.uid,
      userName: r.user.name,
      userEmail: r.user.email,
    }));
  }

  async findHistory(
    userId: string,
    options: PageOptions,
  ): Promise<Page<SessionHistoryRow>> {
    const totalRow = await this.responses
      .createQueryBuilder('qr')
      .select('COUNT(DISTINCT qr.sessionId)', 'total')
      .where('qr.userId = :userId', { userId })
      .getRawOne<{ total: string }>();
    const rows = await this.responses
      .createQueryBuilder('qr')
      .innerJoin('qr.session', 'session')
      .innerJoin('session.quiz', 'quiz')
      .select('session.sessionId', 'sessionId')
      .addSelect('quiz.title', 'quizTitle')
      .addSelect(
        'COALESCE(session.actualStart, session.scheduledStart)',
        'date',
      )
      .addSelect('SUM(qr.pointsScored)', 'score')
      .where('qr.userId = :userId', { userId })
      .groupBy('session.sessionId')
      .addGroupBy('quiz.title')
      .addGroupBy('session.actualStart')
      .addGroupBy('session.scheduledStart')
      .orderBy('"date"', 'DESC')
      .addOrderBy('session.sessionId', 'DESC')
      .offset((options.page - 1) * options.pageSize)
      .limit(options.pageSize)
      .getRawMany<{
        sessionId: string;
        quizTitle: string;
        date: Date;
        score: string;
      }>();

    return toPage(
      rows.map((row) => ({ ...row, score: Number(row.score) || 0 })),
      Number(totalRow?.total) || 0,
      options,
    );
  }

  save(response: QuestionResponse): Promise<QuestionResponse> {
    return this.responses.save(response);
  }

  create(data: Partial<QuestionResponse>): QuestionResponse {
    return this.responses.create(data);
  }
}
