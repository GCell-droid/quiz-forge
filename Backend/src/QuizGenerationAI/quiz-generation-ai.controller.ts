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
    if (file && dto.fileIds && dto.fileIds.length > 0)
      throw new BadRequestException('Choose saved notes or upload a new one.');
    const topic =
      dto.topic?.trim() ||
      (file ? `Key concepts from ${file.originalname}` : '') ||
      (dto.fileIds && dto.fileIds.length > 0 ? 'Main ideas and key concepts from the provided documents' : '');
      
    if (topic.length < 3)
      throw new BadRequestException(
        'Please enter a topic of at least 3 characters.',
      );
    const numQuestions = dto.questionCount ?? dto.numQuestions ?? 5;
    let fileIds: string[] = [];
    if (dto.fileIds && dto.fileIds.length > 0) fileIds = [...dto.fileIds];
    
    if (file) {
      const ingested = await this.notes.ingestDocument(file, teacherId);
      fileIds.push(ingested.fileId);
    }

    const retrieval = await this.notes.retrieveContext(
      topic,
      teacherId,
      numQuestions,
      fileIds.length > 0 ? fileIds : undefined,
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
    if (!file && (!dto.fileIds || dto.fileIds.length === 0))
      throw new BadRequestException('Please choose a study document.');
    return this.generateQuiz(dto, user, file);
  }
}
