import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QUIZ_MODEL } from './quiz-model.port';
import type { QuizModel } from './quiz-model.port';
import type {
  GeneratedQuiz,
  GenerateQuizRequest,
  QuizGenerator,
} from './quiz-generator.port';
import { quizRequestSchema, safeQuizSchema } from './quiz-generation.schema';

@Injectable()
export class QuizGenerationService implements QuizGenerator {
  private readonly logger = new Logger(QuizGenerationService.name);

  constructor(@Inject(QUIZ_MODEL) private readonly model: QuizModel) {}

  async generate(request: GenerateQuizRequest): Promise<GeneratedQuiz> {
    const input = quizRequestSchema.safeParse(request);
    if (!input.success) {
      throw new BadRequestException('Invalid quiz generation request');
    }

    let generated: unknown;
    try {
      generated = await this.model.generate(input.data);
    } catch (error) {
      this.logger.warn(
        `Quiz model failed: ${error instanceof Error ? error.name : 'unknown error'}`,
      );
      throw new ServiceUnavailableException(
        'Quiz generation is temporarily unavailable',
      );
    }

    const output = safeQuizSchema.safeParse(generated);
    if (
      !output.success ||
      output.data.questions.length !== input.data.numQuestions
    ) {
      this.logger.warn(
        'Quiz model returned invalid structure or question count',
      );
      throw new BadGatewayException('Quiz generation returned invalid content');
    }

    return {
      title: output.data.title,
      description: output.data.description,
      questions: output.data.questions.map((question) => ({
        title: question.title,
        options: question.options,
        correctAnswer: question.options.find(
          (option) =>
            option.toLocaleLowerCase() ===
            question.correctAnswer.toLocaleLowerCase(),
        )!,
        type: 'MULTIPLE_CHOICE',
        points: 1,
      })),
    };
  }
}
