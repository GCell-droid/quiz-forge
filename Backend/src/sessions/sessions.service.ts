import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  QuizSession,
  SessionStatus,
} from './entities/quiz-session.entity/quiz-session.entity';
import { QuizzesService } from '../quizzes/quizzes.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import User from '../common/entity/user.entity';
import { RedisService } from '../redis/redis.service';
import { QuestionResponse } from './entities/question-response.entity/question-response.entity';

@Injectable()
export class SessionsService {
  private readonly PRE_WARM_OFFSET_MS = 120000; // 2 minutes
  private readonly CACHE_TTL_SECONDS = 86400; // 24 hours

  constructor(
    @InjectRepository(QuizSession)
    private readonly sessionRepo: Repository<QuizSession>,
    @InjectRepository(QuestionResponse)
    private readonly questionResponseRepo: Repository<QuestionResponse>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly quizzesService: QuizzesService,
    @InjectQueue('quiz-lifecycle')
    private readonly quizLifecycleQueue: Queue,
    private readonly redisService: RedisService,
  ) {}

  async getMyResults(userId: string, sessionIdParam: string) {
    const isUuid = sessionIdParam.length > 10;
    const session = await this.sessionRepo.findOne({
      where: isUuid
        ? { sessionId: sessionIdParam }
        : { joinCode: sessionIdParam },
      relations: ['quiz'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const sessionId = session.sessionId;

    const quiz = await this.quizzesService.getQuiz(session.quiz.quizId);

    const responses = await this.questionResponseRepo.find({
      where: { session: { sessionId }, user: { uid: userId } },
      relations: ['question'],
    });

    let totalScore = 0;
    let totalPossible = 0;
    let correctCount = 0;

    const responseMap = new Map(
      responses.map((r) => [r.question.questionId, r]),
    );

    const detailedResponses =
      quiz.quizQuestions?.map((qq) => {
        const q = qq.question;
        const r = responseMap.get(q.questionId);

        totalPossible += q.points;

        if (r) {
          totalScore += r.pointsScored;
          if (r.isCorrect) correctCount++;
        }

        return {
          questionId: q.questionId,
          title: q.title,
          type: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          pointsPossible: q.points,
          userResponse: r?.response || null,
          isCorrect: r?.isCorrect || false,
          pointsScored: r?.pointsScored || 0,
          timeTakenSecs: r?.timeTakenSecs || 0,
        };
      }) || [];

    const accuracy =
      totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    return {
      sessionId,
      quizTitle: quiz.title,
      totalScore,
      totalPossible,
      accuracy,
      correctCount,
      totalQuestions: quiz.quizQuestions?.length || 0,
      responses: detailedResponses,
    };
  }

  async scheduleSession(
    userId: string,
    quizId: string,
    scheduledStart: Date,
    timeLimit: number,
  ) {
    const quiz = await this.quizzesService.getQuiz(quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (new Date(scheduledStart).getTime() < Date.now()) {
      throw new BadRequestException(
        'Scheduled start time must be in the future',
      );
    }

    let savedSession!: QuizSession;
    let retries = 0;
    const MAX_RETRIES = 5;

    while (retries < MAX_RETRIES) {
      try {
        const joinCode = this.generateJoinCode();

        const session = this.sessionRepo.create({
          quiz,
          createdBy: { uid: userId } as User,
          joinCode,
          status: SessionStatus.SCHEDULED,
          scheduledStart,
          timeLimit,
        });

        savedSession = await this.sessionRepo.save(session);
        break;
      } catch (error: any) {
        if (error.code === '23505') {
          retries++;
          if (retries === MAX_RETRIES) {
            throw new InternalServerErrorException(
              'Failed to generate a unique join code after multiple attempts',
            );
          }
        } else {
          throw error;
        }
      }
    }

    const now = Date.now();
    const startTimeMs = new Date(scheduledStart).getTime();

    const preWarmTimeMs = startTimeMs - this.PRE_WARM_OFFSET_MS;
    const delayPreWarm = Math.max(0, preWarmTimeMs - now);
    const delayGoLive = Math.max(0, startTimeMs - now);

    await this.quizLifecycleQueue.add(
      'pre-warm',
      { sessionId: savedSession.sessionId },
      { delay: delayPreWarm, jobId: `pre-warm-${savedSession.sessionId}` },
    );

    await this.quizLifecycleQueue.add(
      'go-live',
      { sessionId: savedSession.sessionId },
      { delay: delayGoLive, jobId: `go-live-${savedSession.sessionId}` },
    );

    const delayEndSession = delayGoLive + timeLimit * 1000;
    await this.quizLifecycleQueue.add(
      'end-session',
      { sessionId: savedSession.sessionId },
      {
        delay: delayEndSession,
        jobId: `end-session-${savedSession.sessionId}`,
      },
    );

    return savedSession;
  }

  private generateJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getHostedSessions(userId: string) {
    return this.sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.quiz', 'quiz')
      .leftJoin('session.createdBy', 'createdBy')
      .where('createdBy.uid = :userId', { userId })
      .orderBy('session.scheduledStart', 'DESC')
      .getMany();
  }

  async getMyHistory(userId: string) {
    const responses = await this.questionResponseRepo.find({
      where: { user: { uid: userId } },
      relations: ['session', 'session.quiz'],
      order: { submittedAt: 'DESC' },
    });

    const sessionMap = new Map();

    for (const r of responses) {
      if (!sessionMap.has(r.session.sessionId)) {
        sessionMap.set(r.session.sessionId, {
          sessionId: r.session.sessionId,
          quizTitle: r.session.quiz.title,
          date: r.session.actualStart || r.session.scheduledStart,
          score: 0,
        });
      }

      const entry = sessionMap.get(r.session.sessionId);
      entry.score += r.pointsScored;
    }

    return Array.from(sessionMap.values());
  }

  async getSessionStats(userId: string, sessionIdParam: string) {
    const isUuid = sessionIdParam.length > 10;
    const session = await this.sessionRepo.findOne({
      where: isUuid
        ? { sessionId: sessionIdParam }
        : { joinCode: sessionIdParam },
      relations: ['quiz', 'createdBy'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const sessionId = session.sessionId;

    if (session.createdBy?.uid !== userId) {
      throw new ForbiddenException(
        'You can only view stats for sessions you created',
      );
    }

    let quiz = await this.quizzesService.getQuiz(session.quiz.quizId);
    let quizPayload: any = null;

    if (quiz && quiz.quizQuestions) {
      quizPayload = {
        sessionId,
        quizTitle: quiz.title,
        questions: quiz.quizQuestions.map((qq: any) => ({
          questionId: qq.question.questionId,
          title: qq.question.title,
          type: qq.question.type,
          options: qq.question.options,
          points: qq.question.points,
        })),
        timeLimit: session.timeLimit,
      };
    }

    const initialStatsPayload = await this.getMergedAnswers(
      sessionId,
      session.createdBy?.uid,
    );

    return {
      success: true,
      data: {
        sessionId,
        status: session.status,
        scheduledStart: session.scheduledStart,
        actualStart: session.actualStart,
        endTime: session.endTime,
        initialStats: initialStatsPayload,
        quizPayload,
      },
    };
  }

  async processJoinSession(sessionIdParam: string, userId?: string) {
    let actualSessionId = sessionIdParam;
    const isUuid = sessionIdParam.length > 10;

    const session = await this.sessionRepo.findOne({
      where: isUuid
        ? { sessionId: sessionIdParam }
        : { joinCode: sessionIdParam },
      relations: ['quiz', 'createdBy'],
    });

    if (!session) {
      return { error: 'Session not found' };
    }

    actualSessionId = session.sessionId;
    let isCreator = userId === session.createdBy?.uid;
    let initialStatsPayload: any[] = [];

    if (isCreator) {
      initialStatsPayload = await this.getMergedAnswers(
        actualSessionId,
        session.createdBy?.uid,
      );
    }

    let quizPayload: any = null;
    let answeredQuestionIds: string[] = [];

    if (!isCreator && userId) {
      // Check Redis first for instant access, even if BullMQ is delayed
      const answersKey = `quiz:session:${actualSessionId}:answers`;
      const cachedAnswers = await this.redisService.hgetall(answersKey);

      if (cachedAnswers && Object.keys(cachedAnswers).length > 0) {
        Object.keys(cachedAnswers).forEach((key) => {
          if (key.startsWith(`${userId}:`)) {
            answeredQuestionIds.push(key.split(':')[1]);
          }
        });
      }

      // Fallback to DB if not found in Redis (or just to be safe)
      if (answeredQuestionIds.length === 0) {
        const dbAnswers = await this.questionResponseRepo.find({
          where: {
            session: { sessionId: actualSessionId },
            user: { uid: userId },
          },
          relations: ['question'],
        });
        answeredQuestionIds = dbAnswers.map((ans) => ans.question.questionId);
      }
    }

    const redisStatus = await this.redisService.get(
      `quiz:session:${actualSessionId}:status`,
    );

    const isSessionActiveOrCompleted =
      redisStatus === SessionStatus.ACTIVE ||
      session.status === SessionStatus.ACTIVE;

    if (
      !isSessionActiveOrCompleted &&
      session.status === SessionStatus.COMPLETED
    ) {
      return { error: 'Session has ended' };
    }

    if (isSessionActiveOrCompleted) {
      const cacheKey = `quiz:session:${actualSessionId}:metadata`;
      let quizData = await this.redisService.get(cacheKey);
      let quiz;

      if (quizData) {
        try {
          quiz = JSON.parse(quizData);
        } catch (e) {
          console.error(
            '[SessionsService] Failed to parse quiz data from Redis',
            e,
          );
        }
      }

      if (!quiz && session.quiz) {
        quiz = await this.quizzesService.getQuiz(session.quiz.quizId);
        if (quiz && session.status !== SessionStatus.COMPLETED) {
          await this.redisService.set(
            cacheKey,
            JSON.stringify(quiz),
            this.CACHE_TTL_SECONDS || 3600, // Hardcode TTL or use existing
          );
        }
      }

      if (quiz && quiz.quizQuestions) {
        let remainingTime = session.timeLimit;
        if (session.actualStart) {
          const elapsedSecs = Math.floor(
            (Date.now() - session.actualStart.getTime()) / 1000,
          );
          remainingTime = Math.max(0, session.timeLimit - elapsedSecs);
        }

        quizPayload = {
          sessionId: actualSessionId,
          quizTitle: quiz.title,
          questions: quiz.quizQuestions.map((qq: any) => ({
            questionId: qq.question.questionId,
            title: qq.question.title,
            type: qq.question.type,
            options: qq.question.options,
            points: qq.question.points,
          })),
          timeLimit: remainingTime,
        };
      }
    }

    return {
      success: true,
      data: {
        sessionId: actualSessionId,
        status: session.status,
        scheduledStart: session.scheduledStart,
        isCreator,
        initialStats: initialStatsPayload,
        answeredQuestionIds,
        quizPayload,
      },
    };
  }

  async evaluateAnswer(
    sessionId: string,
    questionId: string,
    response: string,
  ) {
    let isCorrect = false;
    let pointsScored = 0;

    const cacheKey = `quiz:session:${sessionId}:metadata`;
    const cachedQuiz = await this.redisService.get(cacheKey);

    if (cachedQuiz) {
      const quiz = JSON.parse(cachedQuiz);
      const questionBridge = quiz.quizQuestions?.find(
        (qq: any) => qq.question.questionId === questionId,
      );

      if (questionBridge) {
        const question = questionBridge.question;
        const correctAnswer = question.correctAnswer;

        if (typeof correctAnswer === 'string') {
          isCorrect =
            correctAnswer.trim().toLowerCase() ===
            response.trim().toLowerCase();
        } else if (typeof correctAnswer === 'number') {
          isCorrect = correctAnswer === Number(response);
        } else if (typeof correctAnswer === 'boolean') {
          isCorrect = correctAnswer === (response.toLowerCase() === 'true');
        } else {
          isCorrect =
            JSON.stringify(correctAnswer) === JSON.stringify(response);
        }

        if (isCorrect) {
          pointsScored = question.points || 1;
        }
      }
    }

    return { isCorrect, pointsScored };
  }

  async getUserName(
    userId: string,
    socketEmail?: string,
    socketName?: string,
  ): Promise<string> {
    if (socketName) return socketName;
    const dbUser = await this.userRepo.findOne({ where: { uid: userId } });
    return (
      dbUser?.name || (socketEmail ? socketEmail.split('@')[0] : 'Unknown')
    );
  }

  async saveAnswerToRedis(
    sessionId: string,
    userId: string,
    questionId: string,
    payload: any,
  ) {
    const answersKey = `quiz:session:${sessionId}:answers`;
    await this.redisService.hset(
      answersKey,
      `${userId}:${questionId}`,
      JSON.stringify(payload),
    );
  }

  async isSessionCreator(
    sessionIdParam: string,
    userId: string,
  ): Promise<boolean> {
    const isUuid = sessionIdParam.length > 10;
    const session = await this.sessionRepo.findOne({
      where: isUuid
        ? { sessionId: sessionIdParam }
        : { joinCode: sessionIdParam },
      relations: ['createdBy'],
    });
    return session?.createdBy?.uid === userId;
  }

  private async getMergedAnswers(sessionId: string, creatorId?: string) {
    const answersKey = `quiz:session:${sessionId}:answers`;
    const cachedAnswers = await this.redisService.hgetall(answersKey);
    const redisStats =
      cachedAnswers && Object.keys(cachedAnswers).length > 0
        ? Object.values(cachedAnswers).map((v) => JSON.parse(v))
        : [];

    const dbAnswers = await this.questionResponseRepo.find({
      where: { session: { sessionId } },
      relations: ['user', 'question'],
    });

    const dbStats = dbAnswers
      .filter((ans) => ans.user?.uid !== creatorId)
      .map((ans) => ({
        questionId: ans.question.questionId,
        userId: ans.user?.uid,
        userName:
          ans.user?.name ||
          (ans.user?.email ? ans.user.email.split('@')[0] : 'Unknown'),
        response: ans.response,
        timeTakenSecs: ans.timeTakenSecs,
        isCorrect: ans.isCorrect,
        pointsScored: ans.pointsScored,
      }));

    const mergedMap = new Map<string, any>();

    // Start with DB answers
    for (const stat of dbStats) {
      mergedMap.set(`${stat.userId}:${stat.questionId}`, stat);
    }

    // Overwrite with Redis answers (live/in-queue takes precedence)
    for (const stat of redisStats) {
      if (stat.userId !== creatorId) {
        mergedMap.set(`${stat.userId}:${stat.questionId}`, stat);
      }
    }

    const mergedArray = Array.from(mergedMap.values());

    // Optional cache warm-up for Redis
    if (mergedArray.length > redisStats.length) {
      for (const stat of mergedArray) {
        await this.redisService.hset(
          answersKey,
          `${stat.userId}:${stat.questionId}`,
          JSON.stringify(stat),
        );
      }
    }

    return mergedArray;
  }
}
