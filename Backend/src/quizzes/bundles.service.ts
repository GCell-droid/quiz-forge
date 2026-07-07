import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { QuestionBundle } from './entities/question-bundle.entity/question-bundle.entity';
import { BundleQuestion } from './entities/bundle-question.entity/bundle-question.entity';
import { Question } from './entities/question.entity/question.entity';
import {
  CreateQuestionBundleDto,
  UpdateQuestionBundleDto,
} from './dto/bundle.dto';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import User from '../common/entity/user.entity';

@Injectable()
export class BundlesService {
  constructor(
    @InjectRepository(QuestionBundle)
    private readonly bundleRepo: Repository<QuestionBundle>,
    @InjectRepository(BundleQuestion)
    private readonly bundleQuestionRepo: Repository<BundleQuestion>,
    private readonly dataSource: DataSource,
  ) {}

  async createBundle(userId: string, data: CreateQuestionBundleDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const bundle = queryRunner.manager.create(QuestionBundle, {
        title: data.title,
        description: data.description,
        visibility: data.visibility,
        tags: data.tags,
        createdBy: { uid: userId } as User,
      });

      const savedBundle = await queryRunner.manager.save(bundle);

      if (data.questions && data.questions.length > 0) {
        for (let i = 0; i < data.questions.length; i++) {
          const qData = data.questions[i];

          const question = queryRunner.manager.create(Question, {
            title: qData.title,
            type: qData.type,
            options: qData.options,
            correctAnswer: qData.correctAnswer,
            points: qData.points ?? 1,
          });
          const savedQuestion = await queryRunner.manager.save(question);

          const bundleQuestion = queryRunner.manager.create(BundleQuestion, {
            bundle: savedBundle,
            question: savedQuestion,
            displayOrder: qData.displayOrder ?? i + 1,
          });
          await queryRunner.manager.save(bundleQuestion);
        }
      }

      await queryRunner.commitTransaction();
      return this.getBundle(savedBundle.bundleId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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
      query.andWhere('createdBy.uid = :userId', { userId });
    } else {
      query.andWhere('bundle.visibility = :visibility', {
        visibility: 'PUBLIC',
      });
    }

    if (searchTags && searchTags.length > 0) {
      const tagConditions = searchTags.map(
        (tag, index) => `:tag${index} = ANY(bundle.tags)`,
      );
      const params: any = {};
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
    data: CreateQuestionDto,
  ) {
    const bundle = await this.getBundle(bundleId);
    if (bundle.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only add questions to your own bundles',
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

      const bundleQuestion = queryRunner.manager.create(BundleQuestion, {
        bundle,
        question: savedQuestion,
        displayOrder: data.displayOrder ?? bundle.questions.length + 1,
      });
      const savedBundleQuestion = await queryRunner.manager.save(bundleQuestion);

      await queryRunner.commitTransaction();
      return savedBundleQuestion;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateBundleQuestion(
    userId: string,
    bridgeId: string,
    data: UpdateQuestionDto,
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
        await queryRunner.manager.update(Question, bundleQuestion.question.questionId, {
          title: data.title ?? bundleQuestion.question.title,
          type: data.type ?? bundleQuestion.question.type,
          options: data.options ?? bundleQuestion.question.options,
          correctAnswer:
            data.correctAnswer ?? bundleQuestion.question.correctAnswer,
          points: data.points ?? bundleQuestion.question.points,
        });
      }

      if (data.displayOrder !== undefined) {
        await queryRunner.manager.update(BundleQuestion, bridgeId, {
          displayOrder: data.displayOrder,
        });
      }

      await queryRunner.commitTransaction();
      return this.bundleQuestionRepo.findOne({
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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(BundleQuestion, bridgeId);
      await queryRunner.manager.delete(Question, questionId);
      
      await queryRunner.commitTransaction();
      return { message: 'Question deleted from bundle successfully' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
