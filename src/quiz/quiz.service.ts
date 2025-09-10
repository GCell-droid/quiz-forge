/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { UserEntity } from 'src/auth/entity/user.entity';
import { QuizEntity } from './entites/quiz.entity';
import { QuestionEntity } from './entites/question.entity';
import { QuizSessionEntity } from './entites/quizsession.entity';
import { ScheduleQuizDto } from './dto/schedule-quiz.dto';
import { CreateQuizDto } from './dto/create-quiz-dto';

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

  /**
   * Create a new quiz with questions
   */
  async createQuiz(dto: CreateQuizDto, teacherId: number): Promise<QuizEntity> {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const questions = dto.questions.map((q) =>
      this.questionRepo.create({
        text: q.text,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
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

  /**
   * Schedule a quiz session (with start/end times and allowed students)
   */
  async scheduleQuiz(
    dto: ScheduleQuizDto,
    teacherId: number,
  ): Promise<QuizSessionEntity> {
    const teacher = await this.userRepo.findOneBy({ id: teacherId });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const quiz = await this.quizRepo.findOne({
      where: { id: dto.quizId },
      relations: ['questions'],
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const session = this.sessionRepo.create({
      quiz,
      teacher,
      isActive: false,
      startedAt: new Date(dto.scheduledStartTime),
      endedAt: new Date(dto.scheduledEndTime),
    });

    // Assign allowed students if provided
    if (dto.allowedStudents?.length) {
      session.allowedStudents = await this.userRepo.findBy({
        id: In(dto.allowedStudents),
      });
    }

    const savedSession = await this.sessionRepo.save(session);

    // Schedule start cron
    this.addCronJob(
      `start-${savedSession.id}`,
      new Date(dto.scheduledStartTime),
      async () => {
        savedSession.isActive = true;
        await this.sessionRepo.save(savedSession);
        console.log(`Quiz Session ${savedSession.id} started`);
      },
    );

    // Schedule end cron
    this.addCronJob(
      `end-${savedSession.id}`,
      new Date(dto.scheduledEndTime),
      async () => {
        savedSession.isActive = false;
        await this.sessionRepo.save(savedSession);
        console.log(`Quiz Session ${savedSession.id} ended`);
      },
    );

    return savedSession;
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
