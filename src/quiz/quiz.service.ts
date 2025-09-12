/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { UserEntity } from 'src/auth/entity/user.entity';
import { QuizEntity } from './entites/quiz.entity';
import { QuestionEntity } from './entites/question.entity';
import { QuizSessionEntity } from './entites/quizsession.entity';
import { ScheduleQuizDto } from './dto/schedule-quiz.dto';
import { CreateQuizDto } from './dto/create-quiz-dto';
import { randomBytes } from 'crypto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { AnswerEntity } from './entites/answer.entity';
import { QuizGateway } from './gateway/quiz.gateway';
@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizEntity)
    private quizRepo: Repository<QuizEntity>,

    @InjectRepository(QuestionEntity)
    private questionRepo: Repository<QuestionEntity>,

    @InjectRepository(QuizSessionEntity)
    private sessionRepo: Repository<QuizSessionEntity>,

    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,

    private schedulerRegistry: SchedulerRegistry,

    @InjectRepository(AnswerEntity)
    private readonly answerRepo: Repository<AnswerEntity>,

    private readonly quizGateway: QuizGateway,
  ) {}

  async createQuiz(dto: CreateQuizDto, teacherId: number): Promise<QuizEntity> {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const questions = dto.questions.map((q) =>
      this.questionRepo.create({
        text: q.text,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        marks: q.marks,
      }),
    );

    const quiz = this.quizRepo.create({
      title: dto.title,
      description: dto.description,
      isAIgenerated: dto.isAIgenerated || false,
      author: teacher,
      timerSeconds: dto.timerSeconds,
      questions,
    });

    return this.quizRepo.save(quiz);
  }

  async scheduleQuiz(dto: ScheduleQuizDto, teacherId: number) {
    try {
      const teacher = await this.userRepo.findOneBy({ id: teacherId });
      if (!teacher) throw new NotFoundException('Teacher not found');

      const quiz = await this.quizRepo.findOne({
        where: { id: dto.quizId },
        relations: ['questions'],
      });
      if (!quiz) throw new NotFoundException('Quiz not found');

      const conflict = await this.sessionRepo.findOne({
        where: {
          quiz: { id: dto.quizId },
          scheduledStartTime: LessThanOrEqual(new Date(dto.scheduledEndTime)),
          scheduledEndTime: MoreThanOrEqual(new Date(dto.scheduledStartTime)),
        },
      });

      if (conflict) {
        throw new BadRequestException(
          `This quiz already has a session scheduled between ${conflict.scheduledStartTime.toISOString()} and ${conflict.scheduledEndTime.toISOString()}`,
        );
      }

      // ✅ Generate random join code
      const joinCode = randomBytes(3).toString('hex').toUpperCase();

      const session = this.sessionRepo.create({
        quiz,
        teacher,
        joinCode,
        scheduledStartTime: new Date(dto.scheduledStartTime),
        scheduledEndTime: new Date(dto.scheduledEndTime),
        isActive: false, // optional, if you don’t rely on it anymore
      });

      if (dto.allowedStudents?.length) {
        session.allowedStudents = await this.userRepo.findBy({
          id: In(dto.allowedStudents),
        });
      }

      const savedSession = await this.sessionRepo.save(session);

      // 🔔 Notify via socket when quiz starts
      this.addCronJob(
        `start-${savedSession.id}`,
        new Date(dto.scheduledStartTime),
        async () => {
          this.quizGateway.server
            .to(savedSession.joinCode)
            .emit('quizStarted', {
              sessionId: savedSession.id,
              quizId: savedSession.quiz.id,
              startTime: savedSession.scheduledStartTime,
            });
        },
      );

      // 🔔 Notify via socket when quiz ends
      this.addCronJob(
        `end-${savedSession.id}`,
        new Date(dto.scheduledEndTime),
        async () => {
          this.quizGateway.server.to(savedSession.joinCode).emit('quizEnded', {
            sessionId: savedSession.id,
            quizId: savedSession.quiz.id,
            endTime: savedSession.scheduledEndTime,
          });
        },
      );

      return savedSession;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Get quiz with questions
   */
  async getQuiz(quizId: number): Promise<QuizEntity> {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: ['questions'],
    });

    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  /**
   * Helper to add cron jobs dynamically
   */
  private addCronJob(name: string, date: Date, callback: () => Promise<void>) {
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.schedulerRegistry.deleteCronJob(name);
    }

    const job = new CronJob(date, async () => {
      await callback();
    });

    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }
  async submitAnswer(studentId: number, dto: SubmitAnswerDto) {
    return await this.answerRepo.manager.transaction(async (manager) => {
      const session = await manager.findOne(QuizSessionEntity, {
        where: { id: dto.sessionId },
        relations: ['quiz', 'allowedStudents'],
      });
      if (!session) throw new NotFoundException('Session not found');
      if (!session.isActive) {
        throw new BadRequestException('Session is not active');
      }

      // check student allowed
      if (session.allowedStudents?.length) {
        const allowed = session.allowedStudents.some((s) => s.id === studentId);
        if (!allowed) {
          throw new ForbiddenException('You are not allowed in this session');
        }
      }

      // ✅ check if already submitted
      const existing = await manager.findOne(AnswerEntity, {
        where: {
          student: { id: studentId },
          question: { id: dto.questionId },
          session: { id: dto.sessionId },
        },
      });
      if (existing) {
        throw new BadRequestException('You have already submitted this answer');
      }

      const question = await manager.findOne(QuestionEntity, {
        where: { id: dto.questionId },
        relations: ['quiz'],
      });
      if (!question) throw new NotFoundException('Question not found');

      // ensure question belongs to this quiz
      if (question.quiz.id !== session.quiz.id) {
        throw new BadRequestException(
          'Question does not belong to session quiz',
        );
      }

      // compute score
      const isCorrect = question.correctAnswerIndex === dto.selectedOptionIndex;
      const score = isCorrect ? question.marks : 0;

      const student = await manager.findOne(UserEntity, {
        where: { id: studentId },
      });
      if (!student) throw new NotFoundException('Student not found');

      const answer = manager.create(AnswerEntity, {
        student,
        question,
        session,
        selectedOptionIndex: dto.selectedOptionIndex,
        score,
      });

      const saved = await manager.save(answer);

      // ✅ Emit update to teacher room (outside transaction effect)
      this.quizGateway.emitAnswerToTeacher(session.id, {
        answerId: saved.id,
        questionId: question.id,
        studentId,
        selectedOptionIndex: dto.selectedOptionIndex,
        score,
        createdAt: saved.createdAt,
      });

      return { ok: true, answerId: saved.id };
    });
  }
  async joinQuiz(studentId: number, joinCode: string) {
    const session = await this.sessionRepo.findOne({
      where: { joinCode },
      relations: ['quiz', 'allowedStudents', 'quiz.questions'],
    });

    if (!session) throw new NotFoundException('Invalid join code');

    const now = new Date();
    if (now < session.scheduledStartTime || now > session.scheduledEndTime) {
      throw new BadRequestException('Quiz is not live');
    }

    // Check if student is allowed
    if (session.allowedStudents?.length) {
      const allowed = session.allowedStudents.some((s) => s.id === studentId);
      if (!allowed) throw new ForbiddenException('Not allowed in this quiz');
    }

    // Add student to socket room (for live updates)
    this.quizGateway.server.socketsJoin(joinCode);

    return {
      sessionId: session.id,
      quizId: session.quiz.id,
      title: session.quiz.title,
      description: session.quiz.description,
      timerSeconds: session.quiz.timerSeconds,
      questions: session.quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        marks: q.marks,
      })),
    };
  }
}
