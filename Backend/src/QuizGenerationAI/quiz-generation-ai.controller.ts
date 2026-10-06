import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Inject,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GeneratedQuiz } from './ai-model.interface';
import { QuizGenerationService } from './quiz-generation.service';
import { GenerateQuizDto } from './DTOs/generate-quiz.dto';
import { RoleGuard } from 'src/auth/guards/roles-guard/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GeminiThrottle } from './guards/gemini-throttle.guard';
import { UserRole } from 'src/common/enums/enum';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/currentUser.decorator';

import { RagPipelineService } from './RAG/rag-pipeline.service';

@Controller('quiz-generations')
@UseGuards(jwtAuthGuard, RoleGuard, GeminiThrottle)
@Roles(UserRole.TEACHER)
export class QuizGenerationAiController {
  constructor(
    private readonly quizGenerator: QuizGenerationService,
    private readonly notes: RagPipelineService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024, files: 1 },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async generateQuiz(
    @Body() dto: GenerateQuizDto,
    @CurrentUser() user?: { userId?: string },
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<GeneratedQuiz> {
    const teacherId = user!.userId!;
    if (file && dto.fileId)
      throw new BadRequestException('Choose a saved note or upload a new one.');
    const topic =
      dto.topic?.trim() ||
      (file ? `Key concepts from ${file.originalname}` : '');
    if (topic.length < 3)
      throw new BadRequestException(
        'Please enter a topic of at least 3 characters.',
      );
    const numQuestions = dto.questionCount ?? dto.numQuestions ?? 5;
    let fileId = dto.fileId;
    if (file)
      fileId = (await this.notes.ingestDocument(file, teacherId)).fileId;
    const retrieval = await this.notes.retrieveContext(
      topic,
      teacherId,
      numQuestions,
      fileId,
    );
    return this.quizGenerator.generate({
      topic,
      numQuestions,
      difficulty: dto.difficulty ?? 'medium',
      ...(dto.gradeLevel ? { gradeLevel: dto.gradeLevel } : {}),
      ...retrieval,
    });
  }

  @Post('rag')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async generateQuizWithRag(
    @Body() dto: GenerateQuizDto,
    @CurrentUser() user?: { userId?: string },
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<GeneratedQuiz> {
    if (!file && !dto.fileId)
      throw new BadRequestException('Please choose a study document.');
    return this.generateQuiz(dto, user, file);
  }
}
