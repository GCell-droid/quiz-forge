import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizSession } from '../entities/quiz-session.entity/quiz-session.entity';
import { Question } from '../../quizzes/entities/question.entity/question.entity';
import User from '../../common/entity/user.entity';
import { RedisService } from '../../redis/redis.service';
import { QuizzesService } from '../../quizzes/quizzes.service';
import { QuestionResponse } from '../entities/question-response.entity/question-response.entity';

import { SessionGateway } from '../events/session/session.gateway';

interface AnswerPayload {
  sessionId: string;
  questionId: string;
  userId: string;
  response: string;
  timeTakenSecs: number;
}

@Processor('answer-ingestion')
@Injectable()
export class AnswerIngestionProcessor extends WorkerHost {
  constructor(
    @InjectRepository(QuestionResponse)
    private readonly responseRepo: Repository<QuestionResponse>,
    @InjectRepository(QuizSession)
    private readonly sessionRepo: Repository<QuizSession>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly redisService: RedisService,
    private readonly quizzesService: QuizzesService,
    private readonly sessionGateway: SessionGateway,
  ) {
    super();
  }

  async process(job: Job<AnswerPayload>): Promise<void> {
    const { sessionId, questionId, userId, response, timeTakenSecs } = job.data;

    // 1. Load Quiz details to verify the correct answer.
    // Try to get from Redis pre-warmed cache first.
    const cacheKey = `quiz:session:${sessionId}:metadata`;
    const cachedQuizData = await this.redisService.get(cacheKey);

    let quiz: any;
    if (cachedQuizData) {
      quiz = JSON.parse(cachedQuizData);
    } else {
      // Fallback: Fetch session and then quiz from DB
      const session = await this.sessionRepo.findOne({
        where: { sessionId },
        relations: ['quiz'],
      });
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
    const isCorrect = this.evaluateAnswer(question, response);
    const pointsScored = isCorrect ? question.points : 0;

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

    await this.responseRepo.save(questionResponse);
    console.log(
      `[Answer Ingestion] Saved answer for user: ${userId}, question: ${questionId}, correct: ${isCorrect}`,
    );

    // 4. Fetch User to broadcast userName
    const user = await this.userRepo.findOne({ where: { uid: userId } });
    const userName =
      user?.name || (user?.email ? user.email.split('@')[0] : 'Unknown');

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
    this.sessionGateway.broadcastToSession(
      sessionId,
      'live_answer_submitted',
      answerPayload,
    );
  }

  private evaluateAnswer(question: any, response: string): boolean {
    const correctAnswer = question.correctAnswer;

    if (typeof correctAnswer === 'string') {
      return (
        correctAnswer.trim().toLowerCase() === response.trim().toLowerCase()
      );
    }

    if (typeof correctAnswer === 'number') {
      return correctAnswer === Number(response);
    }

    if (typeof correctAnswer === 'boolean') {
      return correctAnswer === (response.toLowerCase() === 'true');
    }

    // Fallback comparison
    return JSON.stringify(correctAnswer) === JSON.stringify(response);
  }
}
