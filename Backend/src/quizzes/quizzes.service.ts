import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Quiz } from './entities/quiz.entity/quiz.entity';
import { Question } from './entities/question.entity/question.entity';
import { QuizQuestion } from './entities/quiz-question.entity/quiz-question.entity';
import { CreateQuizDto, UpdateQuizDto } from './dto/quiz.dto';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import User from '../common/entity/user.entity';
import { BundlesService } from './bundles.service';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private readonly quizQuestionRepo: Repository<QuizQuestion>,
    private readonly bundlesService: BundlesService,
    private readonly dataSource: DataSource,
  ) {}

  async createQuiz(userId: string, data: CreateQuizDto) {
    let rawQuestions: any[] = [];

    if (data.bundleIds && data.bundleIds.length > 0) {
      let currentOrder = 1;

      for (const bId of data.bundleIds) {
        const bundle = await this.bundlesService.getBundle(bId);
        if (bundle.questions && bundle.questions.length > 0) {
          // Sort by bundle's internal displayOrder to maintain intended order
          const sortedQuestions = bundle.questions.sort((a, b) => a.displayOrder - b.displayOrder);
          
          for (const bq of sortedQuestions) {
            rawQuestions.push({
              title: bq.question.title,
              type: bq.question.type,
              options: bq.question.options,
              correctAnswer: bq.question.correctAnswer,
              points: bq.question.points,
              displayOrder: currentOrder++,
            });
          }
        }
      }
      
      if (rawQuestions.length === 0) {
        throw new BadRequestException('The selected bundles resulted in zero valid questions');
      }
    } else if (data.questions && data.questions.length > 0) {
      rawQuestions = data.questions;
    } else {
      throw new BadRequestException('A quiz must have at least one question');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const quiz = queryRunner.manager.create(Quiz, {
        title: data.title,
        description: data.description,
        status: data.status,
        visibility: data.visibility,
        tags: data.tags,
        createdBy: { uid: userId } as User,
      });

      const savedQuiz = await queryRunner.manager.save(quiz);

      for (let i = 0; i < rawQuestions.length; i++) {
        const qData = rawQuestions[i];

        const question = queryRunner.manager.create(Question, {
          title: qData.title,
          type: qData.type,
          options: qData.options,
          correctAnswer: qData.correctAnswer,
          points: qData.points ?? 1,
        });
        const savedQuestion = await queryRunner.manager.save(question);

        const quizQuestion = queryRunner.manager.create(QuizQuestion, {
          quiz: savedQuiz,
          question: savedQuestion,
          displayOrder: qData.displayOrder ?? i + 1,
        });
        await queryRunner.manager.save(quizQuestion);
      }

      await queryRunner.commitTransaction();
      return this.getQuiz(savedQuiz.quizId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getQuiz(quizId: string) {
    const quiz = await this.quizRepo
      .createQueryBuilder('quiz')
      .where('quiz.quizId = :quizId', { quizId })
      .leftJoinAndSelect('quiz.quizQuestions', 'quizQuestions')
      .leftJoinAndSelect('quizQuestions.question', 'question')
      .leftJoin('quiz.createdBy', 'createdBy')
      .addSelect(['createdBy.uid', 'createdBy.name', 'createdBy.email'])
      .getOne();

    if (!quiz) throw new NotFoundException('Quiz not found');

    if (quiz.quizQuestions) {
      quiz.quizQuestions.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    return quiz;
  }

  async getAllQuizzes(userId?: string) {
    const query = this.quizRepo
      .createQueryBuilder('quiz')
      .leftJoin('quiz.createdBy', 'createdBy')
      .addSelect(['createdBy.uid', 'createdBy.name', 'createdBy.email'])
      .orderBy('quiz.createdAt', 'DESC');

    if (userId) {
      query.andWhere('createdBy.uid = :userId', { userId });
    } else {
      query.andWhere('quiz.visibility = :visibility', {
        visibility: 'PUBLIC',
      });
    }

    return query.getMany();
  }

  async updateQuiz(userId: string, quizId: string, data: UpdateQuizDto) {
    const quiz = await this.getQuiz(quizId);
    if (quiz.createdBy.uid !== userId) {
      throw new ForbiddenException('You can only edit your own quizzes');
    }
    await this.quizRepo.update(quizId, data);
    return this.getQuiz(quizId);
  }

  async deleteQuiz(userId: string, quizId: string) {
    const quiz = await this.getQuiz(quizId);
    if (quiz.createdBy.uid !== userId) {
      throw new ForbiddenException('You can only delete your own quizzes');
    }
    await this.quizRepo.delete(quizId);
    return { message: 'Quiz deleted successfully' };
  }

  async addQuestionToQuiz(
    userId: string,
    quizId: string,
    data: CreateQuestionDto,
  ) {
    const quiz = await this.getQuiz(quizId);
    if (quiz.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only add questions to your own quizzes',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const question = queryRunner.manager.create(Question, {
        title: data.title,
        type: data.type,
        options: data.options,
        correctAnswer: data.correctAnswer,
        points: data.points ?? 1,
      });
      const savedQuestion = await queryRunner.manager.save(question);

      const quizQuestion = queryRunner.manager.create(QuizQuestion, {
        quiz,
        question: savedQuestion,
        displayOrder:
          data.displayOrder ??
          (quiz.quizQuestions ? quiz.quizQuestions.length + 1 : 1),
      });

      const savedQuizQuestion = await queryRunner.manager.save(quizQuestion);

      await queryRunner.commitTransaction();
      return savedQuizQuestion;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateQuizQuestion(
    userId: string,
    bridgeId: string,
    data: UpdateQuestionDto,
  ) {
    const quizQuestion = await this.quizQuestionRepo.findOne({
      where: { id: bridgeId },
      relations: ['question', 'quiz', 'quiz.createdBy'],
    });

    if (!quizQuestion)
      throw new NotFoundException('Quiz question bridge not found');
    if (quizQuestion.quiz.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only edit questions in your own quizzes',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (
        data.title ||
        data.type ||
        data.options ||
        data.correctAnswer ||
        data.points
      ) {
        await queryRunner.manager.update(Question, quizQuestion.question.questionId, {
          title: data.title ?? quizQuestion.question.title,
          type: data.type ?? quizQuestion.question.type,
          options: data.options ?? quizQuestion.question.options,
          correctAnswer:
            data.correctAnswer ?? quizQuestion.question.correctAnswer,
          points: data.points ?? quizQuestion.question.points,
        });
      }

      if (data.displayOrder !== undefined) {
        await queryRunner.manager.update(QuizQuestion, bridgeId, {
          displayOrder: data.displayOrder,
        });
      }

      await queryRunner.commitTransaction();

      return this.quizQuestionRepo.findOne({
        where: { id: bridgeId },
        relations: ['question'],
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteQuizQuestion(userId: string, bridgeId: string) {
    const quizQuestion = await this.quizQuestionRepo.findOne({
      where: { id: bridgeId },
      relations: ['question', 'quiz', 'quiz.createdBy'],
    });
    if (!quizQuestion)
      throw new NotFoundException('Quiz question bridge not found');
    if (quizQuestion.quiz.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only delete questions from your own quizzes',
      );
    }

    const questionId = quizQuestion.question.questionId;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(QuizQuestion, bridgeId);
      await queryRunner.manager.delete(Question, questionId);

      await queryRunner.commitTransaction();
      return { message: 'Question deleted from quiz successfully' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
