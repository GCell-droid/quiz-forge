import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import User from '../../common/entity/user.entity';
import {
  CreateQuestionBundleDto,
  UpdateQuestionBundleDto,
} from '../dto/bundle.dto';
import { CreateQuestionDto, UpdateQuestionDto } from '../dto/question.dto';
import { BundleQuestion } from '../entities/bundle-question.entity/bundle-question.entity';
import { QuestionBundle } from '../entities/question-bundle.entity/question-bundle.entity';
import { Question } from '../entities/question.entity/question.entity';
import { Page, PageOptions, toPage } from '../../common/pagination';

@Injectable()
export class BundleRepository {
  constructor(
    @InjectRepository(QuestionBundle)
    private readonly bundles: Repository<QuestionBundle>,
    @InjectRepository(BundleQuestion)
    private readonly bridges: Repository<BundleQuestion>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(bundleId: string): Promise<QuestionBundle> {
    const bundle = await this.bundles
      .createQueryBuilder('bundle')
      .where('bundle.bundleId = :bundleId', { bundleId })
      .leftJoinAndSelect('bundle.questions', 'bundleQuestions')
      .leftJoinAndSelect('bundleQuestions.question', 'question')
      .leftJoin('bundle.createdBy', 'createdBy')
      .addSelect(['createdBy.uid', 'createdBy.name', 'createdBy.email'])
      .getOne();
    if (!bundle) throw new NotFoundException('Bundle not found');
    bundle.questions?.sort((a, b) => a.displayOrder - b.displayOrder);
    return bundle;
  }

  async findByIds(bundleIds: string[]): Promise<QuestionBundle[]> {
    if (bundleIds.length === 0) return [];
    const bundles = await this.bundles
      .createQueryBuilder('bundle')
      .where('bundle.bundleId IN (:...bundleIds)', { bundleIds })
      .leftJoinAndSelect('bundle.questions', 'bundleQuestions')
      .leftJoinAndSelect('bundleQuestions.question', 'question')
      .getMany();
    bundles.forEach((bundle) =>
      bundle.questions?.sort((a, b) => a.displayOrder - b.displayOrder),
    );
    return bundles;
  }

  async findAll(
    options: PageOptions,
    userId?: string,
    searchTags?: string[],
  ): Promise<Page<QuestionBundle>> {
    const query = this.bundles
      .createQueryBuilder('bundle')
      .leftJoinAndSelect('bundle.questions', 'bundleQuestions')
      .leftJoinAndSelect('bundleQuestions.question', 'question')
      .leftJoin('bundle.createdBy', 'createdBy')
      .addSelect(['createdBy.uid', 'createdBy.name', 'createdBy.email'])
      .orderBy('bundle.createdAt', 'DESC')
      .addOrderBy('bundle.bundleId', 'DESC')
      .skip((options.page - 1) * options.pageSize)
      .take(options.pageSize);
    if (userId) query.where('createdBy.uid = :userId', { userId });
    else
      query.where('bundle.visibility = :visibility', { visibility: 'PUBLIC' });
    if (searchTags?.length) {
      query.andWhere('bundle.tags && :searchTags', { searchTags });
    }
    const [items, total] = await query.getManyAndCount();
    return toPage(items, total, options);
  }

  async findOwnerId(bundleId: string): Promise<string | null> {
    const row = await this.bundles
      .createQueryBuilder('bundle')
      .innerJoin('bundle.createdBy', 'createdBy')
      .select('createdBy.uid', 'ownerId')
      .where('bundle.bundleId = :bundleId', { bundleId })
      .getRawOne<{ ownerId: string }>();
    return row?.ownerId ?? null;
  }

  async createWithQuestions(
    userId: string,
    data: CreateQuestionBundleDto,
  ): Promise<QuestionBundle> {
    const bundleId = await this.dataSource.transaction(async (manager) => {
      const bundle = await manager.save(
        manager.create(QuestionBundle, {
          title: data.title,
          description: data.description,
          visibility: data.visibility,
          tags: data.tags,
          createdBy: { uid: userId } as User,
        }),
      );
      if (data.questions?.length) {
        const questions = await manager.save(
          data.questions.map((question) =>
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
          questions.map((question, index) =>
            manager.create(BundleQuestion, {
              bundle,
              question,
              displayOrder: data.questions![index].displayOrder ?? index + 1,
            }),
          ),
        );
      }
      return bundle.bundleId;
    });
    return this.findById(bundleId);
  }

  async updateMetadata(
    bundleId: string,
    data: UpdateQuestionBundleDto,
  ): Promise<QuestionBundle> {
    await this.bundles.update(bundleId, data);
    return this.findById(bundleId);
  }

  async delete(bundleId: string): Promise<void> {
    await this.bundles.delete(bundleId);
  }

  findQuestionBridge(bridgeId: string): Promise<BundleQuestion | null> {
    return this.bridges.findOne({
      where: { id: bridgeId },
      relations: ['question', 'bundle', 'bundle.createdBy'],
    });
  }

  async addQuestion(
    bundle: QuestionBundle,
    data: CreateQuestionDto,
  ): Promise<BundleQuestion> {
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
      return manager.save(
        manager.create(BundleQuestion, {
          bundle,
          question,
          displayOrder: data.displayOrder ?? bundle.questions.length + 1,
        }),
      );
    });
  }

  async updateQuestion(
    bridge: BundleQuestion,
    data: UpdateQuestionDto,
  ): Promise<BundleQuestion | null> {
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
        await manager.update(BundleQuestion, bridge.id, {
          displayOrder: data.displayOrder,
        });
      }
    });
    return this.bridges.findOne({
      where: { id: bridge.id },
      relations: ['question'],
    });
  }

  async deleteQuestion(bridge: BundleQuestion): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(BundleQuestion, bridge.id);
      await manager.delete(Question, bridge.question.questionId);
    });
  }
}
