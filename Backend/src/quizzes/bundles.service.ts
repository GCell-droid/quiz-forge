import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateQuestionBundleDto,
  UpdateQuestionBundleDto,
} from './dto/bundle.dto';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { BundleRepository } from './repositories/bundle.repository';
import { PageOptions } from '../common/pagination';

@Injectable()
export class BundlesService {
  constructor(private readonly bundles: BundleRepository) {}

  createBundle(userId: string, data: CreateQuestionBundleDto) {
    return this.bundles.createWithQuestions(userId, data);
  }

  getBundle(bundleId: string) {
    return this.bundles.findById(bundleId);
  }

  getBundles(bundleIds: string[]) {
    return this.bundles.findByIds(bundleIds);
  }

  getAllBundles(options: PageOptions, userId?: string, searchTags?: string[]) {
    return this.bundles.findAll(options, userId, searchTags);
  }

  async updateBundle(
    userId: string,
    bundleId: string,
    data: UpdateQuestionBundleDto,
  ) {
    await this.assertBundleOwner(userId, bundleId);
    return this.bundles.updateMetadata(bundleId, data);
  }

  async deleteBundle(userId: string, bundleId: string) {
    await this.assertBundleOwner(userId, bundleId);
    await this.bundles.delete(bundleId);
    return { message: 'Bundle deleted successfully' };
  }

  async addQuestionToBundle(
    userId: string,
    bundleId: string,
    data: CreateQuestionDto,
  ) {
    await this.assertBundleOwner(userId, bundleId);
    return this.bundles.addQuestion({ bundleId } as any, data);
  }

  async updateBundleQuestion(
    userId: string,
    bridgeId: string,
    data: UpdateQuestionDto,
  ) {
    const bridge = await this.bundles.findQuestionBridge(bridgeId);
    if (!bridge)
      throw new NotFoundException('Bundle question bridge not found');
    if (bridge.bundle.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only edit questions in your own bundles',
      );
    }
    return this.bundles.updateQuestion(bridge, data);
  }

  async deleteBundleQuestion(userId: string, bridgeId: string) {
    const bridge = await this.bundles.findQuestionBridge(bridgeId);
    if (!bridge)
      throw new NotFoundException('Bundle question bridge not found');
    if (bridge.bundle.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only delete questions from your own bundles',
      );
    }
    await this.bundles.deleteQuestion(bridge);
    return { message: 'Question deleted from bundle successfully' };
  }

  private async requireOwnedBundle(userId: string, bundleId: string) {
    const bundle = await this.bundles.findById(bundleId);
    if (bundle.createdBy.uid !== userId) {
      throw new ForbiddenException('You can only edit your own bundles');
    }
    return bundle;
  }

  private async assertBundleOwner(
    userId: string,
    bundleId: string,
  ): Promise<void> {
    const ownerId = await this.bundles.findOwnerId(bundleId);
    if (!ownerId) throw new NotFoundException('Bundle not found');
    if (ownerId !== userId)
      throw new ForbiddenException('You can only edit your own bundles');
  }
}
