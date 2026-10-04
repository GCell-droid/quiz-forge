import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  QuizSession,
  SessionStatus,
} from './entities/quiz-session.entity/quiz-session.entity';
import { QuizzesService } from '../quizzes/quizzes.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import User from '../common/entity/user.entity';
import { UserRole } from '../common/enums/enum';
import { RedisService } from '../redis/redis.service';
import {
  SessionRepository,
  isSessionUuid,
} from './repositories/session.repository';
import { ResponseRepository } from './repositories/response.repository';
import { PageOptions } from '../common/pagination';

@Injectable()
export class SessionsService {
  private readonly PRE_WARM_OFFSET_MS = 120000; // 2 minutes
  private readonly CACHE_TTL_SECONDS = 86400; // 24 hours
  private readonly quizMetadataCache = new Map<
    string,
    { quiz: any; expiresAt: number }
  >();
  private readonly METADATA_CACHE_TTL_MS = 60000; // 60 seconds

  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly responseRepo: ResponseRepository,
    private readonly quizzesService: QuizzesService,
    @InjectQueue('quiz-lifecycle')
    private readonly quizLifecycleQueue: Queue,
    private readonly redisService: RedisService,
  ) {}

  async getMyResults(
    userId: string,
    sessionIdParam: string,
    userRole?: string,
  ) {
    const session = await this.sessionRepo.findByReference(sessionIdParam);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const isTeacher =
      userRole === UserRole.TEACHER || session.createdBy?.uid === userId;

    if (!isTeacher && session.status !== SessionStatus.COMPLETED) {
      throw new BadRequestException(
        'Quiz results are only available after the session has ended',
      );
    }

    const sessionId = session.sessionId;

    const quiz = await this.quizzesService.getQuiz(session.quiz.quizId);

    const responses = await this.responseRepo.findForUser(sessionId, userId);

    let totalScore = 0;
    let totalPossible = 0;
    let correctCount = 0;

    const responseMap = new Map(responses.map((r) => [r.questionId, r]));

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

        const session = {
          quiz,
          createdBy: { uid: userId } as User,
          joinCode,
          status: SessionStatus.SCHEDULED,
          scheduledStart,
          timeLimit,
        };

        savedSession = await this.sessionRepo.createScheduled(session);
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

    let delayGoLive = Math.max(0, startTimeMs - now);
    if (delayGoLive - delayPreWarm < 2000) {
      delayGoLive = delayPreWarm + 2000;
    }

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

  async getHostedSessions(userId: string, options: PageOptions) {
    return this.sessionRepo.findHostedBy(userId, options);
  }

  async getMyHistory(userId: string, options: PageOptions) {
    return this.responseRepo.findHistory(userId, options);
  }

  async getSessionStats(userId: string, sessionIdParam: string) {
    const session = await this.sessionRepo.findByReference(sessionIdParam);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const sessionId = session.sessionId;

    if (session.createdBy?.uid !== userId) {
      throw new ForbiddenException(
        'You can only view stats for sessions you created',
      );
    }

    const quiz = await this.quizzesService.getQuiz(session.quiz.quizId);
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
          correctAnswer: qq.question.correctAnswer,
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
    const isUuid = isSessionUuid(sessionIdParam);

    if (!isUuid) {
      const resolvedSessionId = await this.redisService.get(
        `quiz:session:code:${sessionIdParam}`,
      );
      if (resolvedSessionId) {
        actualSessionId = resolvedSessionId;
      }
    }

    const [sessionDetailsStr, redisStatus] = await Promise.all([
      this.redisService.get(`quiz:session:${actualSessionId}:details`),
      this.redisService.get(`quiz:session:${actualSessionId}:status`),
    ]);

    let sessionDetails: any = null;

    if (sessionDetailsStr) {
      sessionDetails = JSON.parse(sessionDetailsStr);
      actualSessionId = sessionDetails.sessionId;
    } else {
      // Fallback
      const session = await this.sessionRepo.findByReference(sessionIdParam);

      if (!session) {
        return { error: 'Session not found' };
      }

      actualSessionId = session.sessionId;
      sessionDetails = {
        sessionId: session.sessionId,
        joinCode: session.joinCode,
        creatorId: session.createdBy?.uid,
        status: session.status,
        timeLimit: session.timeLimit,
        scheduledStart: session.scheduledStart,
        actualStart: session.actualStart,
        endTime: session.endTime,
        quizId: session.quiz?.quizId,
      };
      await this.redisService.set(
        `quiz:session:${actualSessionId}:details`,
        JSON.stringify(sessionDetails),
        3600,
      );
      await this.redisService.set(
        `quiz:session:code:${session.joinCode}`,
        session.sessionId,
        3600,
      );
    }

    const isCreator = userId === sessionDetails.creatorId;
    let initialStatsPayload: any[] = [];

    if (isCreator) {
      initialStatsPayload = await this.getMergedAnswers(
        actualSessionId,
        sessionDetails.creatorId,
      );
    }

    let quizPayload: any = null;
    let answeredQuestionIds: string[] = [];

    if (!isCreator && userId) {
      // 1. Fetch instantly from the Redis Set populated by the Gateway
      const answeredSetKey = `quiz:session:${actualSessionId}:answered:${userId}`;
      const redisAnswerIds = await this.redisService.smembers(answeredSetKey);

      if (redisAnswerIds && redisAnswerIds.length > 0) {
        answeredQuestionIds = redisAnswerIds;
      } else {
        // 2. Fallback to DB ONLY if the Redis Set is empty and userId is a valid UUID
        if (isSessionUuid(userId)) {
          answeredQuestionIds = await this.responseRepo.findQuestionIdsForUser(
            actualSessionId,
            userId,
          );

          // Warm up the cache for next time
          if (answeredQuestionIds.length > 0) {
            await this.redisService.sadd(
              answeredSetKey,
              ...answeredQuestionIds,
            );
          }
        }
      }
    }

    // redisStatus is already fetched concurrently above

    if (this.isSessionExpired(sessionDetails)) {
      if (sessionDetails.status !== SessionStatus.COMPLETED) {
        sessionDetails.status = SessionStatus.COMPLETED;
        sessionDetails.endTime = sessionDetails.endTime || new Date();
        await Promise.all([
          this.redisService.del(`quiz:session:${actualSessionId}:status`),
          this.redisService.set(
            `quiz:session:${actualSessionId}:details`,
            JSON.stringify(sessionDetails),
            3600,
          ),
          this.sessionRepo.markCompleted(actualSessionId),
        ]);
      }
      return { error: 'Session has ended' };
    }

    const now = Date.now();
    const hasScheduledTimePassed =
      Boolean(sessionDetails.scheduledStart) &&
      new Date(sessionDetails.scheduledStart).getTime() <= now;

    const isSessionActive =
      redisStatus === SessionStatus.ACTIVE ||
      sessionDetails.status === SessionStatus.ACTIVE ||
      hasScheduledTimePassed;

    if (
      hasScheduledTimePassed &&
      sessionDetails.status === SessionStatus.SCHEDULED
    ) {
      sessionDetails.status = SessionStatus.ACTIVE;
      if (!sessionDetails.actualStart) {
        sessionDetails.actualStart = new Date(sessionDetails.scheduledStart);
      }
      await Promise.all([
        this.redisService.set(
          `quiz:session:${actualSessionId}:status`,
          SessionStatus.ACTIVE,
          3600,
        ),
        this.redisService.set(
          `quiz:session:${actualSessionId}:details`,
          JSON.stringify(sessionDetails),
          3600,
        ),
      ]);
    }

    if (isSessionActive) {
      const cacheKey = `quiz:session:${actualSessionId}:metadata`;
      const quizData = await this.redisService.get(cacheKey);
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

      if (!quiz && sessionDetails.quizId) {
        quiz = await this.quizzesService.getQuiz(sessionDetails.quizId);
        if (quiz && sessionDetails.status !== SessionStatus.COMPLETED) {
          await this.redisService.set(
            cacheKey,
            JSON.stringify(quiz),
            this.CACHE_TTL_SECONDS || 3600, // Hardcode TTL or use existing
          );
        }
      }

      if (quiz && quiz.quizQuestions) {
        const { isExpired, remainingTimeSecs } =
          this.getRemainingTimeSecs(sessionDetails);
        const remainingTime = remainingTimeSecs;

        if (isExpired) {
          sessionDetails.status = SessionStatus.COMPLETED;
          sessionDetails.endTime = sessionDetails.endTime || new Date();
          await Promise.all([
            this.redisService.del(`quiz:session:${actualSessionId}:status`),
            this.redisService.set(
              `quiz:session:${actualSessionId}:details`,
              JSON.stringify(sessionDetails),
              3600,
            ),
            this.sessionRepo.markCompleted(actualSessionId),
          ]);
          return { error: 'Session has ended' };
        }

        let questionsToReturn: any[] = [];
        if (isCreator) {
          questionsToReturn = quiz.quizQuestions.map((qq: any) => ({
            questionId: qq.question.questionId,
            title: qq.question.title,
            type: qq.question.type,
            options: qq.question.options,
            points: qq.question.points,
          }));
        } else {
          const unanswered = quiz.quizQuestions.find(
            (qq: any) => !answeredQuestionIds.includes(qq.question.questionId),
          );
          if (unanswered) {
            questionsToReturn = [
              {
                questionId: unanswered.question.questionId,
                title: unanswered.question.title,
                type: unanswered.question.type,
                options: unanswered.question.options,
                points: unanswered.question.points,
              },
            ];
          }
        }

        quizPayload = {
          sessionId: actualSessionId,
          quizTitle: quiz.title,
          questions: questionsToReturn,
          totalQuestions: quiz.quizQuestions.length,
          timeLimit: remainingTime,
        };
      }
    }

    return {
      success: true,
      data: {
        sessionId: actualSessionId,
        status: isSessionActive ? SessionStatus.ACTIVE : sessionDetails.status,
        scheduledStart: sessionDetails.scheduledStart,
        isCreator,
        initialStats: initialStatsPayload,
        answeredQuestionIds,
        quizPayload,
      },
    };
  }

  private async getMergedAnswers(sessionId: string, creatorId?: string) {
    const answersKey = `quiz:session:${sessionId}:answers`;
    const cachedAnswers = await this.redisService.hgetall(answersKey);
    const redisStats =
      cachedAnswers && Object.keys(cachedAnswers).length > 0
        ? Object.values(cachedAnswers).map((v) => JSON.parse(v))
        : [];

    const dbAnswers = await this.responseRepo.findForSession(sessionId);

    const dbStats = dbAnswers
      .filter((ans) => ans.userId !== creatorId)
      .map((ans) => ({
        questionId: ans.questionId,
        userId: ans.userId,
        userName:
          ans.userName ||
          (ans.userEmail ? ans.userEmail.split('@')[0] : 'Unknown'),
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

    // Optional cache warm-up for Redis (batched into a single command)
    if (mergedArray.length > redisStats.length) {
      const dataToWarm: Record<string, string> = {};
      for (const stat of mergedArray) {
        dataToWarm[`${stat.userId}:${stat.questionId}`] = JSON.stringify(stat);
      }
      if (Object.keys(dataToWarm).length > 0) {
        await this.redisService.hset(answersKey, dataToWarm);
      }
    }

    return mergedArray;
  }

  async getNextQuestionForUser(sessionId: string, userId: string) {
    const answeredSetKey = `quiz:session:${sessionId}:answered:${userId}`;
    const cacheKey = `quiz:session:${sessionId}:metadata`;

    // 1. Try to get quiz metadata from local memory first (0ms)
    let quiz: any = null;
    const memCached = this.quizMetadataCache.get(sessionId);
    if (memCached && memCached.expiresAt > Date.now()) {
      quiz = memCached.quiz;
    }

    // 2. Fetch answered set and (if not in memory) quiz metadata from Redis
    const [redisAnswerIds, quizData] = await Promise.all([
      this.redisService.smembers(answeredSetKey),
      quiz ? Promise.resolve(null) : this.redisService.get(cacheKey),
    ]);

    const answeredQuestionIds = redisAnswerIds || [];

    if (!quiz && quizData) {
      try {
        quiz = JSON.parse(quizData);
        this.quizMetadataCache.set(sessionId, {
          quiz,
          expiresAt: Date.now() + this.METADATA_CACHE_TTL_MS,
        });
      } catch {
        // Fallback
      }
    }

    // Fallback if metadata is not pre-warmed in Redis
    if (!quiz) {
      const session = await this.sessionRepo.findByIdWithQuiz(sessionId);
      if (session?.quiz?.quizId) {
        quiz = await this.quizzesService.getQuiz(session.quiz.quizId);
        if (quiz) {
          this.quizMetadataCache.set(sessionId, {
            quiz,
            expiresAt: Date.now() + this.METADATA_CACHE_TTL_MS,
          });
          await this.redisService.set(cacheKey, JSON.stringify(quiz), 3600);
        }
      }
    }

    if (!quiz || !quiz.quizQuestions || quiz.quizQuestions.length === 0) {
      return null;
    }

    const answeredSet = new Set(answeredQuestionIds);
    const unanswered = quiz.quizQuestions.find(
      (qq: any) => !answeredSet.has(qq.question.questionId),
    );

    if (!unanswered || !unanswered.question) {
      return null;
    }

    return {
      questionId: unanswered.question.questionId,
      title: unanswered.question.title,
      type: unanswered.question.type,
      options: unanswered.question.options,
      points: unanswered.question.points,
    };
  }

  async getNextQuestionAfter(
    sessionId: string,
    currentQuestionId: string,
    userId?: string,
  ): Promise<any | null> {
    // 1. Check in-memory metadata cache first (0ms, 0 Redis calls)
    let quiz = this.quizMetadataCache.get(sessionId)?.quiz;

    // 2. Fallback to Redis if not yet in memory
    if (!quiz) {
      const cacheKey = `quiz:session:${sessionId}:metadata`;
      const quizData = await this.redisService.get(cacheKey);
      if (quizData) {
        try {
          quiz = JSON.parse(quizData);
          this.quizMetadataCache.set(sessionId, {
            quiz,
            expiresAt: Date.now() + this.METADATA_CACHE_TTL_MS,
          });
        } catch {
          // Fallback
        }
      }
    }

    if (!quiz?.quizQuestions || quiz.quizQuestions.length === 0) {
      return userId ? this.getNextQuestionForUser(sessionId, userId) : null;
    }

    const questions = quiz.quizQuestions;
    const currentIndex = questions.findIndex(
      (qq: any) => qq.question?.questionId === currentQuestionId,
    );

    if (currentIndex !== -1) {
      const nextIndex = currentIndex + 1;
      if (nextIndex < questions.length) {
        const nextQ = questions[nextIndex].question;
        return {
          questionId: nextQ.questionId,
          title: nextQ.title,
          type: nextQ.type,
          options: nextQ.options,
          points: nextQ.points,
        };
      }
      return null; // Quiz finished
    }

    return userId ? this.getNextQuestionForUser(sessionId, userId) : null;
  }

  public getRemainingTimeSecs(sessionDetails: {
    status: SessionStatus;
    scheduledStart?: Date | string;
    actualStart?: Date | string;
    timeLimit: number;
  }): { isExpired: boolean; remainingTimeSecs: number } {
    if (sessionDetails.status === SessionStatus.COMPLETED) {
      return { isExpired: true, remainingTimeSecs: 0 };
    }

    const start = sessionDetails.actualStart || sessionDetails.scheduledStart;
    if (!start) {
      return {
        isExpired: false,
        remainingTimeSecs: sessionDetails.timeLimit || 0,
      };
    }

    const startDate = typeof start === 'string' ? new Date(start) : start;
    const elapsedSecs = Math.floor((Date.now() - startDate.getTime()) / 1000);
    const remainingTime = Math.max(
      0,
      (sessionDetails.timeLimit || 0) - elapsedSecs,
    );

    return {
      isExpired: remainingTime <= 0,
      remainingTimeSecs: remainingTime,
    };
  }

  public isSessionExpired(sessionDetails: {
    status: SessionStatus;
    scheduledStart?: Date | string;
    actualStart?: Date | string;
    timeLimit: number;
  }): boolean {
    return this.getRemainingTimeSecs(sessionDetails).isExpired;
  }
}
