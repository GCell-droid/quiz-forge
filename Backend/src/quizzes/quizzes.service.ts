import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateQuizDto, UpdateQuizDto } from './dto/quiz.dto';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { BundlesService } from './bundles.service';
import { QuizRepository } from './repositories/quiz.repository';
import { PageOptions } from '../common/pagination';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly quizzes: QuizRepository,
    private readonly bundlesService: BundlesService,
  ) {}

  async createQuiz(userId: string, data: CreateQuizDto) {
    let questions: CreateQuestionDto[] = [];

    if (data.bundleIds?.length) {
      const bundles = await this.bundlesService.getBundles(data.bundleIds);
      const byId = new Map(bundles.map((bundle) => [bundle.bundleId, bundle]));
      let displayOrder = 1;
      for (const bundleId of data.bundleIds) {
        const bundle = byId.get(bundleId);
        for (const bridge of [...(bundle?.questions ?? [])].sort(
          (a, b) => a.displayOrder - b.displayOrder,
        )) {
          questions.push({
            title: bridge.question.title,
            type: bridge.question.type,
            options: bridge.question.options,
            correctAnswer: bridge.question.correctAnswer,
            points: bridge.question.points,
            displayOrder: displayOrder++,
          });
        }
      }
      if (questions.length === 0) {
        throw new BadRequestException(
          'The selected bundles resulted in zero valid questions',
        );
      }
    } else if (data.questions?.length) {
      questions = data.questions;
    } else {
      throw new BadRequestException('A quiz must have at least one question');
    }

    return this.quizzes.createWithQuestions(userId, data, questions);
  }

  getQuiz(quizId: string) {
    return this.quizzes.findById(quizId);
  }

  getAllQuizzes(options: PageOptions, userId?: string) {
    return this.quizzes.findAll(options, userId);
  }

  async updateQuiz(userId: string, quizId: string, data: UpdateQuizDto) {
    await this.assertQuizOwner(userId, quizId);
    return this.quizzes.updateMetadata(quizId, data);
  }

  async deleteQuiz(userId: string, quizId: string) {
    await this.assertQuizOwner(userId, quizId);
    await this.quizzes.delete(quizId);
    return { message: 'Quiz deleted successfully' };
  }

  async addQuestionToQuiz(
    userId: string,
    quizId: string,
    data: CreateQuestionDto,
  ) {
    await this.assertQuizOwner(userId, quizId);
    return this.quizzes.addQuestion({ quizId } as any, data);
  }

  async updateQuizQuestion(
    userId: string,
    bridgeId: string,
    data: UpdateQuestionDto,
  ) {
    const bridge = await this.quizzes.findQuestionBridge(bridgeId);
    if (!bridge) throw new NotFoundException('Quiz question bridge not found');
    if (bridge.quiz.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only edit questions in your own quizzes',
      );
    }
    return this.quizzes.updateQuestion(bridge, data);
  }

  async deleteQuizQuestion(userId: string, bridgeId: string) {
    const bridge = await this.quizzes.findQuestionBridge(bridgeId);
    if (!bridge) throw new NotFoundException('Quiz question bridge not found');
    if (bridge.quiz.createdBy.uid !== userId) {
      throw new ForbiddenException(
        'You can only delete questions from your own quizzes',
      );
    }
    await this.quizzes.deleteQuestion(bridge);
    return { message: 'Question deleted from quiz successfully' };
  }

  private async requireOwnedQuiz(userId: string, quizId: string) {
    const quiz = await this.quizzes.findById(quizId);
    if (quiz.createdBy.uid !== userId) {
      throw new ForbiddenException('You can only edit your own quizzes');
    }
    return quiz;
  }

  private async assertQuizOwner(userId: string, quizId: string): Promise<void> {
    const ownerId = await this.quizzes.findOwnerId(quizId);
    if (!ownerId) throw new NotFoundException('Quiz not found');
    if (ownerId !== userId)
      throw new ForbiddenException('You can only edit your own quizzes');
  }
}
