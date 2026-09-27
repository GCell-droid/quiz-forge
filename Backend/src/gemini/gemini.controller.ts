import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { QUIZ_GENERATOR } from './quiz-generator.port';
import type { GeneratedQuiz, QuizGenerator } from './quiz-generator.port';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { RoleGuard } from 'src/auth/guards/roles-guard/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GeminiThrottle } from 'src/gemini/guards/gemini-throttle.guard';
import { UserRole } from 'src/common/enums/enum';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';

@Controller('quiz-generations')
export class GeminiController {
  constructor(
    @Inject(QUIZ_GENERATOR) private readonly quizGenerator: QuizGenerator,
  ) {}
  @Roles(UserRole.TEACHER)
  @UseGuards(jwtAuthGuard, RoleGuard, GeminiThrottle)
  @Post()
  @HttpCode(HttpStatus.OK)
  async generateQuiz(@Body() dto: GenerateQuizDto): Promise<GeneratedQuiz> {
    return this.quizGenerator.generate({
      topic: dto.topic,
      numQuestions: dto.numQuestions ?? 5,
      difficulty: dto.difficulty ?? 'medium',
    });
  }
}
