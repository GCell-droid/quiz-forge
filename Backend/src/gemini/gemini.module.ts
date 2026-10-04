import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherNote } from './rag/note.entity';
import { TeacherNotesController } from './rag/teacher-notes.controller';
import { GeminiController } from './gemini.controller';
import { QuizGenerationService } from './quiz-generation.service';
import { LangChainGeminiModel } from './langchain-gemini.model';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { QUIZ_GENERATOR } from './quiz-generator.port';
import { QUIZ_MODEL } from './quiz-model.port';
import { DocumentParserService } from './rag/document-parser.service';
import { TextSplitterService } from './rag/text-splitter.service';
import { GeminiEmbeddingService } from './rag/gemini-embedding.service';
import { PineconeService } from './rag/pinecone.service';
import { BackblazeStorageService } from './rag/backblaze-storage.service';
import { RagPipelineService } from './rag/rag-pipeline.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherNote])],
  providers: [
    QuizGenerationService,
    LangChainGeminiModel,
    { provide: QUIZ_GENERATOR, useExisting: QuizGenerationService },
    { provide: QUIZ_MODEL, useExisting: LangChainGeminiModel },
    DocumentParserService,
    TextSplitterService,
    GeminiEmbeddingService,
    PineconeService,
    BackblazeStorageService,
    RagPipelineService,
    jwtAuthGuard,
  ],
  controllers: [GeminiController, TeacherNotesController],
  exports: [QUIZ_GENERATOR, QuizGenerationService, RagPipelineService],
})
export class GeminiModule {}
