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
import { QUIZ_GENERATOR } from './quiz-generator.port';
import type { GeneratedQuiz, QuizGenerator } from './quiz-generator.port';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { RoleGuard } from 'src/auth/guards/roles-guard/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GeminiThrottle } from './guards/gemini-throttle.guard';
import { UserRole } from 'src/common/enums/enum';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/currentUser.decorator';
import { RagPipelineService } from './rag/rag-pipeline.service';
import { MAX_NOTE_BYTES, requireTeacherId } from './rag/note.errors';

@Controller('quiz-generations')
@UseGuards(jwtAuthGuard, RoleGuard, GeminiThrottle)
@Roles(UserRole.TEACHER)
export class GeminiController {
  constructor(
    @Inject(QUIZ_GENERATOR) private readonly quizGenerator: QuizGenerator,
    private readonly notes: RagPipelineService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_NOTE_BYTES, files: 1 } }),
  )
  @HttpCode(HttpStatus.OK)
  async generateQuiz(
    @Body() dto: GenerateQuizDto,
    @CurrentUser() user?: { userId?: string },
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<GeneratedQuiz> {
    const teacherId = requireTeacherId(user?.userId);
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
    FileInterceptor('file', { limits: { fileSize: MAX_NOTE_BYTES, files: 1 } }),
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
