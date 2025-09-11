/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  BadRequestException,
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
      const joinCode = randomBytes(3).toString('hex').toUpperCase(); // 6-char code like 'A1B2C3'

      const session = this.sessionRepo.create({
        quiz,
        teacher,
        joinCode,
        scheduledStartTime: new Date(dto.scheduledStartTime),
        scheduledEndTime: new Date(dto.scheduledEndTime),
        isActive: false,
      });

      if (dto.allowedStudents?.length) {
        session.allowedStudents = await this.userRepo.findBy({
          id: In(dto.allowedStudents),
        });
      }

      const savedSession = await this.sessionRepo.save(session);

      // Start cron
      this.addCronJob(
        `start-${savedSession.id}`,
        new Date(dto.scheduledStartTime),
        async () => {
          savedSession.isActive = true;
          savedSession.startedAt = new Date();
          await this.sessionRepo.save(savedSession);
        },
      );

      // End cron
      this.addCronJob(
        `end-${savedSession.id}`,
        new Date(dto.scheduledEndTime),
        async () => {
          savedSession.isActive = false;
          savedSession.endedAt = new Date();
          await this.sessionRepo.save(savedSession);
        },
      );

      return savedSession;
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) {
        throw e;
      }
      throw new InternalServerErrorException(e.message);
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
}
