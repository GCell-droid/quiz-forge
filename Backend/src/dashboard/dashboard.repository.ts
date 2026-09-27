import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionBundle } from '../quizzes/entities/question-bundle.entity/question-bundle.entity';
import { Quiz } from '../quizzes/entities/quiz.entity/quiz.entity';
import { QuestionResponse } from '../sessions/entities/question-response.entity/question-response.entity';
import { QuizSession } from '../sessions/entities/quiz-session.entity/quiz-session.entity';

export interface TeacherDashboard {
  role: 'teacher';
  bundles: { count: number; recent: { bundleId: string; title: string }[] };
  quizzes: { count: number; recent: { quizId: string; title: string }[] };
  sessions: {
    count: number;
    recent: {
      sessionId: string;
      status: string;
      scheduledStart: Date;
      quizTitle: string;
    }[];
  };
}

export interface StudentDashboard {
  role: 'student';
  recentResults: {
    sessionId: string;
    quizTitle: string;
    date: Date;
    score: number;
  }[];
}

@Injectable()
export class DashboardRepository {
  constructor(
    @InjectRepository(QuestionBundle)
    private readonly bundles: Repository<QuestionBundle>,
    @InjectRepository(Quiz) private readonly quizzes: Repository<Quiz>,
    @InjectRepository(QuizSession)
    private readonly sessions: Repository<QuizSession>,
    @InjectRepository(QuestionResponse)
    private readonly responses: Repository<QuestionResponse>,
  ) {}

  async getTeacherDashboard(userId: string): Promise<TeacherDashboard> {
    const [
      bundleCount,
      recentBundles,
      quizCount,
      recentQuizzes,
      sessionCount,
      recentSessions,
    ] = await Promise.all([
      this.bundles.count({ where: { createdBy: { uid: userId } } }),
      this.bundles
        .createQueryBuilder('bundle')
        .select('bundle.bundleId', 'bundleId')
        .addSelect('bundle.title', 'title')
        .where('bundle.createdBy = :userId', { userId })
        .orderBy('bundle.createdAt', 'DESC')
        .limit(5)
        .getRawMany<{ bundleId: string; title: string }>(),
      this.quizzes.count({ where: { createdBy: { uid: userId } } }),
      this.quizzes
        .createQueryBuilder('quiz')
        .select('quiz.quizId', 'quizId')
        .addSelect('quiz.title', 'title')
        .where('quiz.createdBy = :userId', { userId })
        .orderBy('quiz.createdAt', 'DESC')
        .limit(5)
        .getRawMany<{ quizId: string; title: string }>(),
      this.sessions.count({ where: { createdBy: { uid: userId } } }),
      this.sessions
        .createQueryBuilder('session')
        .innerJoin('session.quiz', 'quiz')
        .select('session.sessionId', 'sessionId')
        .addSelect('session.status', 'status')
        .addSelect('session.scheduledStart', 'scheduledStart')
        .addSelect('quiz.title', 'quizTitle')
        .where('session.createdBy = :userId', { userId })
        .orderBy('session.scheduledStart', 'DESC')
        .limit(5)
        .getRawMany<{
          sessionId: string;
          status: string;
          scheduledStart: Date;
          quizTitle: string;
        }>(),
    ]);

    return {
      role: 'teacher',
      bundles: { count: bundleCount, recent: recentBundles },
      quizzes: { count: quizCount, recent: recentQuizzes },
      sessions: { count: sessionCount, recent: recentSessions },
    };
  }

  async getStudentDashboard(userId: string): Promise<StudentDashboard> {
    const rows = await this.responses
      .createQueryBuilder('response')
      .innerJoin('response.session', 'session')
      .innerJoin('session.quiz', 'quiz')
      .select('session.sessionId', 'sessionId')
      .addSelect('quiz.title', 'quizTitle')
      .addSelect(
        'COALESCE(session.actualStart, session.scheduledStart)',
        'date',
      )
      .addSelect('SUM(response.pointsScored)', 'score')
      .where('response.userId = :userId', { userId })
      .groupBy('session.sessionId')
      .addGroupBy('quiz.title')
      .addGroupBy('session.actualStart')
      .addGroupBy('session.scheduledStart')
      .orderBy('"date"', 'DESC')
      .limit(5)
      .getRawMany<{
        sessionId: string;
        quizTitle: string;
        date: Date;
        score: string;
      }>();

    return {
      role: 'student',
      recentResults: rows.map((row) => ({
        ...row,
        score: Number(row.score) || 0,
      })),
    };
  }
}
