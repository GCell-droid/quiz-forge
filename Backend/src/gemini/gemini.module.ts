import { Module } from '@nestjs/common';
import { GeminiController } from './gemini.controller';
import { QuizGenerationService } from './quiz-generation.service';
import { LangChainGeminiModel } from './langchain-gemini.model';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { QUIZ_GENERATOR } from './quiz-generator.port';
import { QUIZ_MODEL } from './quiz-model.port';

@Module({
  providers: [
    QuizGenerationService,
    LangChainGeminiModel,
    { provide: QUIZ_GENERATOR, useExisting: QuizGenerationService },
    { provide: QUIZ_MODEL, useExisting: LangChainGeminiModel },
    jwtAuthGuard,
  ],
  controllers: [GeminiController],
})
export class GeminiModule {}
