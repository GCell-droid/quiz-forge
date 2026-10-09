import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherNote } from './RAG/note.entity';
import { TeacherNotesController } from './RAG/teacher-notes.controller';
import { QuizGenerationAiController } from './quiz-generation-ai.controller';
import { QuizGenerationService } from './quiz-generation.service';
import { LangChainGeminiModel } from './Model_Gemini/langchain-gemini.model';
import { AiModel } from './ai-model.interface';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { PineconeService } from './RAG/pinecone.service';
import { RagPipelineService } from './RAG/rag-pipeline.service';
import { BackblazeStorageService } from './RAG/backblaze-storage.service';
import {
  BLOB_STORAGE,
  VECTOR_STORE,
  DOCUMENT_PROCESSOR,
} from './RAG/rag.interfaces';
import { UnstructuredDocumentStrategy } from './RAG/unstructured-document.strategy';
import { LocalDocumentStrategy } from './RAG/local-document.strategy';
import { FallbackDocumentStrategy } from './RAG/fallback-document.strategy';
@Module({
  imports: [TypeOrmModule.forFeature([TeacherNote])],
  providers: [
    QuizGenerationService,
    LangChainGeminiModel,
    // AI Model Strategy Provider: easily swap LangChainGeminiModel with another AiModel (e.g. OpenAiModel)
    { provide: AiModel, useClass: LangChainGeminiModel },
    { provide: VECTOR_STORE, useClass: PineconeService },
    { provide: BLOB_STORAGE, useClass: BackblazeStorageService },
    UnstructuredDocumentStrategy,
    LocalDocumentStrategy,
    FallbackDocumentStrategy,
    { provide: DOCUMENT_PROCESSOR, useClass: FallbackDocumentStrategy },
    RagPipelineService,
    jwtAuthGuard,
  ],
  controllers: [QuizGenerationAiController, TeacherNotesController],
  exports: [AiModel, QuizGenerationService, RagPipelineService],
})
export class QuizGenerationAiModule {}
