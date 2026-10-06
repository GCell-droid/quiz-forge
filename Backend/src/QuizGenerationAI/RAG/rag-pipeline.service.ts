import { BadRequestException, Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { BLOB_STORAGE, VECTOR_STORE, DOCUMENT_PROCESSOR } from './rag.interfaces';
import type { BlobStorage, VectorStore, DocumentProcessorStrategy, ProcessedChunk } from './rag.interfaces';
import { TeacherNote } from './note.entity';
import { AiModel } from '../ai-model.interface';

export interface NoteSummary {
  fileId: string;
  fileName: string;
  size: number;
  chunkCount?: number;
  status: TeacherNote['status'];
  createdAt: Date;
}

export interface NotesListing {
  notes: NoteSummary[];
}

export interface RetrievalResult {
  context: string;
  validChunkCount: number;
}

@Injectable()
export class RagPipelineService {
  private readonly logger = new Logger(RagPipelineService.name);

  constructor(
    @Inject(VECTOR_STORE) private readonly vectorStore: VectorStore,
    @Inject(BLOB_STORAGE) private readonly storage: BlobStorage,
    @Inject(DOCUMENT_PROCESSOR) private readonly documentProcessor: DocumentProcessorStrategy,
    @Inject(AiModel) private readonly aiModel: AiModel,
    @InjectRepository(TeacherNote) private readonly notes: Repository<TeacherNote>,
  ) {}

  async list(teacherId: string): Promise<NotesListing> {
    const notes = await this.notes.find({ where: { teacherId }, order: { createdAt: 'DESC' } });
    return { notes: notes.map((note) => this.summary(note)) };
  }

  async ingestDocument(file: Express.Multer.File, teacherId: string): Promise<NoteSummary> {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a non-empty document.');

    const chunks = await this.documentProcessor.parsePipeline(file);
    if (!chunks.length) throw new BadRequestException('This document has no readable study material.');

    const fileId = randomUUID();
    const fileName = (file.originalname || 'document').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
    const folderKey = `teachers/${teacherId}/notes/${fileId}/`;
    const objectKey = `${folderKey}document.pdf`;

    let note = this.notes.create({
      fileId,
      teacherId,
      fileName,
      size: file.buffer.length,
      objectKey,
      chunkCount: chunks.length,
      status: 'processing',
    });
    
    note = await this.notes.save(note);

    try {
      await this.storage.uploadFile(file, objectKey);

      const vectorChunks: { text: string; metadata?: Record<string, any> }[] = [];
      let imageCounter = 0;

      for (const chunk of chunks) {
        let finalChunk = { text: chunk.text, metadata: {} as Record<string, any> };
        
        if (chunk.type === 'image' && chunk.metadata?.base64) {
          imageCounter++;
          const imageKey = `${folderKey}images/img_${imageCounter}.txt`;
          await this.storage.uploadBase64(chunk.metadata.base64, imageKey);
          
          const summary = await this.aiModel.summarizeElement('image', chunk.metadata.base64);
          finalChunk.text = summary;
          finalChunk.metadata.imageUrl = imageKey;
        } else if (chunk.type === 'table' && chunk.metadata?.html) {
          const summary = await this.aiModel.summarizeElement('table', chunk.metadata.html);
          finalChunk.text = summary + '\n\n' + chunk.text;
          finalChunk.metadata.html = chunk.metadata.html;
        }

        vectorChunks.push(finalChunk);
      }

      await this.vectorStore.upsertChunks(teacherId, fileId, fileName, vectorChunks);
      note.status = 'ready';
      await this.notes.save(note);
      return this.summary(note);
    } catch (error) {
      this.logger.error(`Failed to ingest note "${fileName}"`, error);
      await this.storage.deleteFolder(folderKey).catch(() => {});
      await this.vectorStore.deleteDocument(teacherId, fileId, note.chunkCount).catch(() => {});
      note.status = 'failed';
      await this.notes.save(note);
      throw new BadRequestException('Your note could not be prepared.');
    }
  }

  async retrieveContext(topic: string, teacherId: string, questionCount: number, fileId?: string): Promise<RetrievalResult> {
    const readyNotes = await this.notes.find({
      where: { teacherId, status: 'ready', ...(fileId ? { fileId } : {}) },
      select: { fileId: true },
    });
    
    if (!readyNotes.length) return { validChunkCount: 0, context: '' };

    const fileIds = readyNotes.map((n) => n.fileId);
    const matches = await this.vectorStore.query(teacherId, topic, questionCount, fileIds);

    const validMatches = matches.filter(m => m.score >= 0.3 && m.text.trim());
    
    return {
      validChunkCount: validMatches.length,
      context: await Promise.all(validMatches.map(async (m, i) => {
        let content = `Excerpt ${i + 1} (${m.fileName}):\n${m.text}`;
        if (m.html) content += `\n\n[Table HTML]:\n${m.html}`;
        if (m.imageUrl) {
          try {
            const base64 = await this.storage.downloadBase64(m.imageUrl);
            content += `\n\n[Image Data Base64]:\n${base64}`;
          } catch (e) {
            this.logger.warn(`Failed to fetch image ${m.imageUrl}`);
          }
        }
        return content;
      })).then(results => results.join('\n\n')),
    };
  }

  async download(teacherId: string, fileId: string): Promise<{ url: string; expiresIn: number }> {
    const note = await this.findNote(teacherId, fileId);
    if (note.status !== 'ready') throw new BadRequestException('This note is not available for download.');
    return {
      url: await this.storage.downloadUrl(note.objectKey),
      expiresIn: 900,
    };
  }

  async deleteDocument(teacherId: string, fileId: string): Promise<void> {
    const note = await this.notes.findOneBy({ teacherId, fileId });
    if (!note) return;
    
    await this.notes.update({ teacherId, fileId }, { status: 'deleting' });
    try {
      await this.vectorStore.deleteDocument(teacherId, fileId, note.chunkCount);
      const folderKey = `teachers/${teacherId}/notes/${fileId}/`;
      await this.storage.deleteFolder(folderKey);
      await this.notes.delete({ teacherId, fileId });
    } catch (error) {
      throw new BadRequestException('Your note could not be fully removed. Please retry.');
    }
  }

  async deleteDocuments(teacherId: string, fileIds: string[]): Promise<{ deleted: string[]; failed: string[] }> {
    const deleted: string[] = [];
    const failed: string[] = [];
    for (const fileId of fileIds) {
      try {
        await this.deleteDocument(teacherId, fileId);
        deleted.push(fileId);
      } catch {
        failed.push(fileId);
      }
    }
    return { deleted, failed };
  }

  private async findNote(teacherId: string, fileId: string): Promise<TeacherNote> {
    const note = await this.notes.findOneBy({ teacherId, fileId });
    if (!note) throw new NotFoundException('Note not found.');
    return note;
  }

  private summary(note: TeacherNote): NoteSummary {
    const { fileId, fileName, size, chunkCount, status, createdAt } = note;
    return { fileId, fileName, size, chunkCount, status, createdAt };
  }
}
