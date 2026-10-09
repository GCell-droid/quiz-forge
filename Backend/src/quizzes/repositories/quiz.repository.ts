import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import User from '../../common/entity/user.entity';
import { CreateQuestionDto, UpdateQuestionDto } from '../dto/question.dto';
import { CreateQuizDto, UpdateQuizDto } from '../dto/quiz.dto';
import { Question } from '../entities/question.entity/question.entity';
import { QuizQuestion } from '../entities/quiz-question.entity/quiz-question.entity';
import { Quiz } from '../entities/quiz.entity/quiz.entity';
import { Page, PageOptions, toPage } from '../../common/pagination';

@Injectable()
export class QuizRepository {
  constructor(
    @InjectRepository(Quiz) private readonly quizzes: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private readonly bridges: Repository<QuizQuestion>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(quizId: string): Promise<Quiz> {
    const quiz = await this.quizzes
      .createQueryBuilder('quiz')
      .where('quiz.quizId = :quizId', { quizId })
      .leftJoinAndSelect('quiz.quizQuestions', 'quizQuestions')
      .leftJoinAndSelect('quizQuestions.question', 'question')
      .leftJoin('quiz.createdBy', 'createdBy')
      .addSelect(['createdBy.uid', 'createdBy.name', 'createdBy.email'])
      .getOne();
    if (!quiz) throw new NotFoundException('Quiz not found');
    quiz.quizQuestions?.sort((a, b) => a.displayOrder - b.displayOrder);
    return quiz;
  }

  async findAll(options: PageOptions, userId?: string): Promise<Page<Quiz>> {
    const query = this.quizzes
      .createQueryBuilder('quiz')
      .leftJoin('quiz.createdBy', 'createdBy')
      .addSelect(['createdBy.uid', 'createdBy.name', 'createdBy.email'])
      .orderBy('quiz.createdAt', 'DESC')
      .addOrderBy('quiz.quizId', 'DESC')
      .skip((options.page - 1) * options.pageSize)
      .take(options.pageSize);
    if (userId) query.where('createdBy.uid = :userId', { userId });
    else query.where('quiz.visibility = :visibility', { visibility: 'PUBLIC' });
    const [items, total] = await query.getManyAndCount();
    return toPage(items, total, options);
  }

  async findOwnerId(quizId: string): Promise<string | null> {
    const row = await this.quizzes
      .createQueryBuilder('quiz')
      .innerJoin('quiz.createdBy', 'createdBy')
      .select('createdBy.uid', 'ownerId')
      .where('quiz.quizId = :quizId', { quizId })
      .getRawOne<{ ownerId: string }>();
    return row?.ownerId ?? null;
  }

  async createWithQuestions(
    userId: string,
    data: CreateQuizDto,
    questions: CreateQuestionDto[],
  ): Promise<Quiz> {
    const quizId = await this.dataSource.transaction(async (manager) => {
      const quiz = await manager.save(
        manager.create(Quiz, {
          title: data.title,
          description: data.description,
          status: data.status,
          visibility: data.visibility,
          tags: data.tags,
          createdBy: { uid: userId } as User,
        }),
      );
      const savedQuestions = await manager.save(
        questions.map((question) =>
          manager.create(Question, {
            title: question.title,
            type: question.type,
            options: question.options,
            correctAnswer: question.correctAnswer,
            points: question.points ?? 1,
          }),
        ),
      );
      await manager.save(
        savedQuestions.map((question, index) =>
          manager.create(QuizQuestion, {
            quiz,
            question,
            displayOrder: questions[index].displayOrder ?? index + 1,
          }),
        ),
      );
      return quiz.quizId;
    });
    return this.findById(quizId);
  }

  async updateMetadata(quizId: string, data: UpdateQuizDto): Promise<Quiz> {
    await this.quizzes.update(quizId, data);
    return this.findById(quizId);
  }

  async delete(quizId: string): Promise<void> {
    await this.quizzes.delete(quizId);
  }

  findQuestionBridge(bridgeId: string): Promise<QuizQuestion | null> {
    return this.bridges.findOne({
      where: { id: bridgeId },
      relations: ['question', 'quiz', 'quiz.createdBy'],
    });
  }

  async addQuestion(
    quiz: Quiz,
    data: CreateQuestionDto,
  ): Promise<QuizQuestion> {
    return this.dataSource.transaction(async (manager) => {
      const question = await manager.save(
        manager.create(Question, {
          title: data.title,
          type: data.type,
          options: data.options,
          correctAnswer: data.correctAnswer,
          points: data.points ?? 1,
        }),
      );
      let displayOrder = data.displayOrder;
      if (displayOrder === undefined || displayOrder === null) {
        if (quiz.quizQuestions?.length !== undefined) {
          displayOrder = quiz.quizQuestions.length + 1;
        } else {
          const count = await manager.count(QuizQuestion, {
            where: { quiz: { quizId: quiz.quizId } },
          });
          displayOrder = count + 1;
        }
      }

      return manager.save(
        manager.create(QuizQuestion, {
          quiz,
          question,
          displayOrder,
        }),
      );
    });
  }

  async updateQuestion(
    bridge: QuizQuestion,
    data: UpdateQuestionDto,
  ): Promise<QuizQuestion | null> {
    await this.dataSource.transaction(async (manager) => {
      if (
        ['title', 'type', 'options', 'correctAnswer', 'points'].some(
          (key) => data[key as keyof UpdateQuestionDto] !== undefined,
        )
      ) {
        await manager.update(Question, bridge.question.questionId, {
          title: data.title ?? bridge.question.title,
          type: data.type ?? bridge.question.type,
          options: data.options ?? bridge.question.options,
          correctAnswer: data.correctAnswer ?? bridge.question.correctAnswer,
          points: data.points ?? bridge.question.points,
        });
      }
      if (data.displayOrder !== undefined) {
        await manager.update(QuizQuestion, bridge.id, {
          displayOrder: data.displayOrder,
        });
      }
    });
    return this.bridges.findOne({
      where: { id: bridge.id },
      relations: ['question'],
    });
  }

  async deleteQuestion(bridge: QuizQuestion): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(QuizQuestion, bridge.id);
      await manager.softDelete(Question, bridge.question.questionId);
    });
  }
}
