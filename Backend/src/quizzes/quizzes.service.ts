import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionBundle } from './entities/question-bundle.entity/question-bundle.entity';
import { BundleQuestion } from './entities/bundle-question.entity/bundle-question.entity';
import { Quiz } from './entities/quiz.entity/quiz.entity';
import { Question } from './entities/question.entity/question.entity';
import { QuizQuestion } from './entities/quiz-question.entity/quiz-question.entity';
import {
  CreateQuestionBundleDto,
  UpdateQuestionBundleDto,
  CreateBundleQuestionDto,
  UpdateBundleQuestionDto,
} from './dto/bundle.dto';
import {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuizQuestionDto,
  UpdateQuizQuestionDto,
} from './dto/quiz.dto';
import User from '../common/entity/user.entity';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(QuestionBundle)
    private readonly bundleRepo: Repository<QuestionBundle>,
    @InjectRepository(BundleQuestion)
    private readonly bundleQuestionRepo: Repository<BundleQuestion>,
    @InjectRepository(Quiz)
    private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(QuizQuestion)
    private readonly quizQuestionRepo: Repository<QuizQuestion>,
  ) {}

  // --- QUESTION BUNDLE METHODS ---

  async createBundle(userId: string, data: CreateQuestionBundleDto) {
    const bundle = this.bundleRepo.create({
      title: data.title,
      description: data.description,
      visibility: data.visibility,
      tags: data.tags,
      createdBy: { uid: userId } as User,
    });

    const savedBundle = await this.bundleRepo.save(bundle);

    if (data.questions && data.questions.length > 0) {
      for (let i = 0; i < data.questions.length; i++) {
        const qData = data.questions[i];

        // 1. Create independent Question entity
        const question = this.questionRepo.create({
          title: qData.title,
          type: qData.type,
          options: qData.options,
          correctAnswer: qData.correctAnswer,
          points: qData.points ?? 1,
        });
        const savedQuestion = await this.questionRepo.save(question);

        // 2. Create bridge entity mapping Bundle <-> Question
        const bundleQuestion = this.bundleQuestionRepo.create({
          bundle: savedBundle,
          question: savedQuestion,
          displayOrder: qData.displayOrder ?? i + 1,
        });
        await this.bundleQuestionRepo.save(bundleQuestion);
      }
    }

    return this.getBundle(savedBundle.bundleId);
  }

  async getBundle(bundleId: string) {
    const bundle = await this.bundleRepo
      .createQueryBuilder('bundle')
      .where('bundle.bundleId = :bundleId', { bundleId })
      .leftJoinAndSelect('bundle.questions', 'bundleQuestions')
      .leftJoinAndSelect('bundleQuestions.question', 'question')
      .leftJoin('bundle.createdBy', 'createdBy')
      .addSelect(['createdBy.uid', 'createdBy.name', 'createdBy.email'])
      .getOne();

    if (!bundle) throw new NotFoundException('Bundle not found');

    // Sort questions by displayOrder before returning
    if (bundle.questions) {
      bundle.questions.sort((a, b) => a.displayOrder - b.displayOrder);
    }
    return bundle;
  }

  async getAllBundles(userId?: string, searchTags?: string[]) {
    const query = this.bundleRepo
      .createQueryBuilder('bundle')
      .leftJoinAndSelect('bundle.questions', 'bundleQuestions')
      .leftJoinAndSelect('bundleQuestions.question', 'question')
      .leftJoin('bundle.createdBy', 'createdBy')
      .addSelect(['createdBy.uid', 'createdBy.name', 'createdBy.email']);

    if (userId) {
      // If a specific userId is requested, show their bundles
      query.andWhere('bundle.createdBy = :userId', { userId });
    } else {
      // If we are browsing (no userId), only show PUBLIC bundles
      query.andWhere('bundle.visibility = :visibility', {
        visibility: 'PUBLIC',
      });
    }

    if (searchTags && searchTags.length > 0) {
      // Find bundles that have AT LEAST ONE matching tag (fast search using GIN index)
      const tagConditions = searchTags.map(
        (tag, index) => `:tag${index} = ANY(bundle.tags)`,
      );
      const params = {};
      searchTags.forEach((tag, index) => {
        params[`tag${index}`] = tag;
      });
      query.andWhere(`(${tagConditions.join(' OR ')})`, params);
    }

    return query.getMany();
  }

  async updateBundle(
    userId: string,
    bundleId: string,
    data: UpdateQuestionBundleDto,
  ) {
    const bundle = await this.getBundle(bundleId);
    if (bundle.createdBy.uid !== userId) {
      throw new ForbiddenException('You can only edit your own bundles');
    }
    await this.bundleRepo.update(bundleId, data);
    return this.getBundle(bundleId);
  }

  async deleteBundle(userId: string, bundleId: string) {
    const bundle = await this.getBundle(bundleId);
    if (bundle.createdBy.uid !== userId) {
      throw new ForbiddenException('You can only delete your own bundles');
    }
    await this.bundleRepo.delete(bundleId);
    return { message: 'Bundle deleted successfully' };
  }

  async addQuestionToBundle(
    userId: string,
    bundleId: string,
    data: CreateBundleQuestionDto,
  ) {
    const bundle = await this.getBundle(bundleId);
    if (bundle.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only add questions to your own bundles',
      );
    }

    // 1. Create the base question
    const question = this.questionRepo.create({
      title: data.title,
      type: data.type,
      options: data.options,
      correctAnswer: data.correctAnswer,
      points: data.points ?? 1,
    });
    const savedQuestion = await this.questionRepo.save(question);

    // 2. Create the bridge record
    const bundleQuestion = this.bundleQuestionRepo.create({
      bundle,
      question: savedQuestion,
      displayOrder: data.displayOrder ?? bundle.questions.length + 1,
    });

    return this.bundleQuestionRepo.save(bundleQuestion);
  }

  async updateBundleQuestion(
    userId: string,
    bridgeId: string,
    data: UpdateBundleQuestionDto,
  ) {
    const bundleQuestion = await this.bundleQuestionRepo.findOne({
      where: { id: bridgeId },
      relations: ['question', 'bundle', 'bundle.createdBy'],
    });

    if (!bundleQuestion)
      throw new NotFoundException('Bundle question bridge not found');
    if (bundleQuestion.bundle.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only edit questions in your own bundles',
      );
    }

    // Update base question details if provided
    if (
      data.title ||
      data.type ||
      data.options ||
      data.correctAnswer ||
      data.points
    ) {
      await this.questionRepo.update(bundleQuestion.question.questionId, {
        title: data.title ?? bundleQuestion.question.title,
        type: data.type ?? bundleQuestion.question.type,
        options: data.options ?? bundleQuestion.question.options,
        correctAnswer:
          data.correctAnswer ?? bundleQuestion.question.correctAnswer,
        points: data.points ?? bundleQuestion.question.points,
      });
    }

    // Update bridge details (e.g. displayOrder)
    if (data.displayOrder !== undefined) {
      await this.bundleQuestionRepo.update(bridgeId, {
        displayOrder: data.displayOrder,
      });
    }

    return this.bundleQuestionRepo.findOne({
      where: { id: bridgeId },
      relations: ['question'],
    });
  }

  async deleteBundleQuestion(userId: string, bridgeId: string) {
    const bundleQuestion = await this.bundleQuestionRepo.findOne({
      where: { id: bridgeId },
      relations: ['question', 'bundle', 'bundle.createdBy'],
    });
    if (!bundleQuestion)
      throw new NotFoundException('Bundle question bridge not found');
    if (bundleQuestion.bundle.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only delete questions from your own bundles',
      );
    }

    const questionId = bundleQuestion.question.questionId;

    // Delete bridge
    await this.bundleQuestionRepo.delete(bridgeId);

    // Delete base question to prevent orphaned records
    await this.questionRepo.delete(questionId);

    return { message: 'Question deleted from bundle successfully' };
  }

  // --- QUIZ METHODS ---

  async createQuiz(userId: string, data: CreateQuizDto) {
    let rawQuestions: any[] = [];

    if (data.bundleId) {
      // Create quiz from bundle
      const bundle = await this.getBundle(data.bundleId);
      if (!bundle.questions || bundle.questions.length === 0) {
        throw new BadRequestException(
          'Cannot create quiz from an empty bundle',
        );
      }

      // Copy questions from bundle to the new quiz
      rawQuestions = bundle.questions.map((bq) => ({
        title: bq.question.title,
        type: bq.question.type,
        options: bq.question.options,
        correctAnswer: bq.question.correctAnswer,
        points: bq.question.points,
        displayOrder: bq.displayOrder,
      }));
    } else if (data.questions && data.questions.length > 0) {
      rawQuestions = data.questions;
    } else {
      throw new BadRequestException('A quiz must have at least one question');
    }

    const quiz = this.quizRepo.create({
      title: data.title,
      description: data.description,
      status: data.status,
      visibility: data.visibility,
      tags: data.tags,
      createdBy: { uid: userId } as User,
    });

    const savedQuiz = await this.quizRepo.save(quiz);

    for (let i = 0; i < rawQuestions.length; i++) {
      const qData = rawQuestions[i];

      // 1. Create a NEW Question entity explicitly, deeply cloned from the bundle question
      const question = this.questionRepo.create({
        title: qData.title,
        type: qData.type,
        options: qData.options,
        correctAnswer: qData.correctAnswer,
        points: qData.points ?? 1,
      });
      const savedQuestion = await this.questionRepo.save(question);

      // 2. Create the QuizQuestion bridge record
      const quizQuestion = this.quizQuestionRepo.create({
        quiz: savedQuiz,
        question: savedQuestion,
        displayOrder: qData.displayOrder ?? i + 1,
      });
      await this.quizQuestionRepo.save(quizQuestion);
    }

    return this.getQuiz(savedQuiz.quizId);
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

    // Sort quiz questions by displayOrder
    if (quiz.quizQuestions) {
      quiz.quizQuestions.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    return quiz;
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
    data: CreateQuizQuestionDto,
  ) {
    const quiz = await this.getQuiz(quizId);
    if (quiz.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only add questions to your own quizzes',
      );
    }

    // 1. Create the base question
    const question = this.questionRepo.create({
      title: data.title,
      type: data.type,
      options: data.options,
      correctAnswer: data.correctAnswer,
      points: data.points ?? 1,
    });
    const savedQuestion = await this.questionRepo.save(question);

    // 2. Create the bridge record
    const quizQuestion = this.quizQuestionRepo.create({
      quiz,
      question: savedQuestion,
      displayOrder:
        data.displayOrder ??
        (quiz.quizQuestions ? quiz.quizQuestions.length + 1 : 1),
    });

    return this.quizQuestionRepo.save(quizQuestion);
  }

  async updateQuizQuestion(
    userId: string,
    bridgeId: string,
    data: UpdateQuizQuestionDto,
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

    // Update base question details if provided
    if (
      data.title ||
      data.type ||
      data.options ||
      data.correctAnswer ||
      data.points
    ) {
      await this.questionRepo.update(quizQuestion.question.questionId, {
        title: data.title ?? quizQuestion.question.title,
        type: data.type ?? quizQuestion.question.type,
        options: data.options ?? quizQuestion.question.options,
        correctAnswer:
          data.correctAnswer ?? quizQuestion.question.correctAnswer,
        points: data.points ?? quizQuestion.question.points,
      });
    }

    // Update bridge details (e.g. displayOrder)
    if (data.displayOrder !== undefined) {
      await this.quizQuestionRepo.update(bridgeId, {
        displayOrder: data.displayOrder,
      });
    }

    return this.quizQuestionRepo.findOne({
      where: { id: bridgeId },
      relations: ['question'],
    });
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

    // Delete bridge
    await this.quizQuestionRepo.delete(bridgeId);

    // Delete base question to prevent orphaned records
    await this.questionRepo.delete(questionId);

    return { message: 'Question deleted from quiz successfully' };
  }
}
