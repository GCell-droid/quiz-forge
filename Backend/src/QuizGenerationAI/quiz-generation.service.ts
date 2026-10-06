import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiModel, GeneratedQuiz, GenerateQuizRequest } from './ai-model.interface';
import { quizRequestSchema, safeQuizSchema } from './quiz-generation.schema';

@Injectable()
export class QuizGenerationService {
  private readonly logger = new Logger(QuizGenerationService.name);

  constructor(private readonly model: AiModel) {}

  async generate(request: GenerateQuizRequest): Promise<GeneratedQuiz> {
    const input = quizRequestSchema.safeParse(request);
    if (!input.success) {
      throw new BadRequestException('Invalid quiz generation request');
    }

    let generated: unknown;
    try {
      generated = await this.model.generate(input.data);
    } catch (error) {
      const errName = error instanceof Error ? error.name : 'UnknownError';
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Quiz model failed: [${errName}] ${errMsg}`);

      const isQuota =
        errMsg.includes('quota') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED');

      if (isQuota) {
        throw new ServiceUnavailableException(
          'AI rate limit reached. Please wait a few seconds and try again.',
        );
      }

      throw new ServiceUnavailableException(
        'Quiz generation is temporarily unavailable',
      );
    }

    const output = safeQuizSchema.safeParse(generated);
    if (!output.success) {
      this.logger.warn(
        `Quiz model validation failed: ${JSON.stringify(output.error.issues)}`,
      );
      throw new BadGatewayException('Quiz generation returned invalid content');
    }

    const hasNotes =
      (input.data.validChunkCount ?? 0) > 0 &&
      Boolean(input.data.context?.trim());
    const expectedSource = hasNotes ? 'teacher_notes' : 'general_knowledge';
    if (
      output.data.questions.length !== input.data.numQuestions ||
      output.data.questions.some(
        (question, index) =>
          question.id !== index + 1 || question.source !== expectedSource,
      )
    ) {
      const reasons: string[] = [];
      if (output.data.questions.length !== input.data.numQuestions) {
        reasons.push(
          `expected ${input.data.numQuestions} questions but got ${output.data.questions.length}`,
        );
      }
      output.data.questions.forEach((q, idx) => {
        if (q.id !== idx + 1) {
          reasons.push(`q[${idx}].id is ${q.id} (expected ${idx + 1})`);
        }
        if (q.source !== expectedSource) {
          reasons.push(
            `q[${idx}].source is "${q.source}" (expected "${expectedSource}")`,
          );
        }
      });
      this.logger.warn(
        `Quiz model returned an invalid question count, ID sequence, or source distribution: ${reasons.join('; ')}`,
      );
      throw new BadGatewayException('Quiz generation returned invalid content');
    }

    return output.data;
  }
}
