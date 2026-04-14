import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { GeminiService, GeneratedQuiz } from '../../application/gemini.service';
import { GenerateQuizDto } from '../../dto/generate-quiz.dto';
import { GoogleOrJwtAuthGuard } from 'src/auth/guards/combinedGuard/combined-auth.guard';
import { RoleGuard } from 'src/auth/guards/roles-guard/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/auth/entity/user.entity';
import { GeminiThrottle } from 'src/gemini/guards/gemini-throttle.guard';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}
  @Roles(UserRole.TEACHER)
  @UseGuards(GoogleOrJwtAuthGuard, RoleGuard, GeminiThrottle)
  @Post('generate-quiz')
  @HttpCode(HttpStatus.OK)
  async generateQuiz(@Body() dto: GenerateQuizDto): Promise<GeneratedQuiz> {
    return this.geminiService.generateQuizFromTopic(
      dto.topic,
      dto.numQuestions || 5,
      dto.difficulty || 'medium',
    );
  }
}
