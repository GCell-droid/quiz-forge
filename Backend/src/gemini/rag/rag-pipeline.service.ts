import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { DocumentParserService } from './document-parser.service';
import { TextSplitterService } from './text-splitter.service';
import { PineconeService } from './pinecone.service';
import { BackblazeStorageService } from './backblaze-storage.service';
import { TeacherNote } from './note.entity';
import {
  MAX_NOTE_BYTES,
  NoteOperationError,
  QuotaExceededError,
  requireTeacherId,
  TEACHER_QUOTA_BYTES,
} from './note.errors';

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
  usedBytes: number;
  limitBytes: number;
}
export interface RetrievalResult {
  context: string;
  validChunkCount: number;
}

@Injectable()
export class RagPipelineService {
  private readonly logger = new Logger(RagPipelineService.name);

  constructor(
    private readonly parser: DocumentParserService,
    private readonly splitter: TextSplitterService,
    private readonly pinecone: PineconeService,
    private readonly storage: BackblazeStorageService,
    @InjectRepository(TeacherNote)
    private readonly notes: Repository<TeacherNote>,
    private readonly database: DataSource,
  ) {}

  async list(teacherId: string): Promise<NotesListing> {
    requireTeacherId(teacherId);
    const [notes, usedBytes] = await Promise.all([
      this.notes.find({ where: { teacherId }, order: { createdAt: 'DESC' } }),
      this.storage.usage(teacherId),
    ]);
    return {
      notes: notes.map((note) => this.summary(note)),
      usedBytes,
      limitBytes: TEACHER_QUOTA_BYTES,
    };
  }

  async storageSummary(
    teacherId: string,
  ): Promise<{ count: number; usedBytes: number; limitBytes: number }> {
    requireTeacherId(teacherId);
    const [count, usedBytes] = await Promise.all([
      this.notes.count({ where: { teacherId } }),
      this.storage.usage(teacherId),
    ]);
    return {
      count,
      usedBytes,
      limitBytes: TEACHER_QUOTA_BYTES,
    };
  }

  async ingestDocument(
    file: Express.Multer.File,
    teacherId: string,
  ): Promise<NoteSummary> {
    requireTeacherId(teacherId);
    if (!file?.buffer?.length || file.buffer.length > MAX_NOTE_BYTES) {
      throw new BadRequestException(
        'Choose a non-empty document smaller than 25 MB.',
      );
    }
    const text = await this.parser.parse(file);
    const chunks = await this.splitter.splitText(text);
    if (!chunks.length)
      throw new BadRequestException(
        'This document has no readable study material.',
      );
    const fileId = randomUUID();
    const fileName = (file.originalname || 'document')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 180);
    const note = this.notes.create({
      fileId,
      teacherId,
      fileName,
      size: file.buffer.length,
      objectKey: this.storage.objectKey(teacherId, fileId, fileName),
      chunkCount: chunks.length,
      status: 'processing',
    });
    return this.withNoteLock(fileId, async () => {
      await this.notes.save(note);
      try {
        await this.storage.uploadFile(file, teacherId, note.objectKey);
        await this.pinecone.upsertChunks(teacherId, fileId, fileName, chunks);
        note.status = 'ready';
        await this.notes.save(note);
        return this.summary(note);
      } catch (error) {
        this.logger.error(
          `Failed to ingest note "${fileName}" (${fileId}): ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
        try {
          await this.storage.deleteFile(teacherId, note.objectKey);
        } catch {}
        try {
          await this.pinecone.deleteDocument(teacherId, fileId, note.chunkCount);
        } catch {}

        if (error instanceof QuotaExceededError) {
          await this.notes.delete({ fileId, teacherId });
          throw error;
        }
        await this.notes.update({ fileId, teacherId }, { status: 'failed' });
        throw new NoteOperationError(
          'Your note could not be prepared. Remove the unfinished note and upload it again.',
          error,
        );
      }
    });
  }

  async retrieveContext(
    topic: string,
    teacherId: string,
    questionCount: number,
    fileId?: string,
  ): Promise<RetrievalResult> {
    requireTeacherId(teacherId);
    if (fileId) {
      const note = await this.findNote(teacherId, fileId);
      if (note.status !== 'ready')
        throw new NoteOperationError(
          'This note is not ready. Please choose another note.',
        );
    }
    const ready = await this.notes.find({
      where: { teacherId, status: 'ready', ...(fileId ? { fileId } : {}) },
      select: { fileId: true },
    });
    const matches = await this.pinecone.query(
      teacherId,
      topic,
      questionCount,
      ready.map((note) => note.fileId),
    );
    // Recheck durable state to exclude deletions that began while the query ran.
    const active = matches.length
      ? await this.notes.find({
          where: {
            teacherId,
            status: 'ready',
            fileId: In(matches.map((match) => match.fileId)),
          },
          select: { fileId: true },
        })
      : [];
    const ids = new Set(active.map((note) => note.fileId));
    const seen = new Set<string>();
    const valid = matches
      .filter((match) => {
        const id = `${match.fileId}#chunk_${match.chunkIndex}`;
        if (
          !ids.has(match.fileId) ||
          !Number.isFinite(match.score) ||
          match.score < 0.3 ||
          !match.text.trim() ||
          seen.has(id)
        )
          return false;
        seen.add(id);
        return true;
      })
      .slice(0, questionCount);
    return {
      validChunkCount: valid.length,
      context: valid
        .map(
          (match, i) => `Excerpt ${i + 1} (${match.fileName}):\n${match.text}`,
        )
        .join('\n\n'),
    };
  }

  async download(
    teacherId: string,
    fileId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    const note = await this.findNote(teacherId, fileId);
    if (note.status !== 'ready')
      throw new NoteOperationError('This note is not available for download.');
    return {
      url: await this.storage.downloadUrl(teacherId, note.objectKey),
      expiresIn: 900,
    };
  }

  async deleteDocument(teacherId: string, fileId: string): Promise<void> {
    requireTeacherId(teacherId);
    await this.withNoteLock(fileId, async () => {
      const note = await this.notes.findOneBy({ teacherId, fileId });
      if (!note) return; // Idempotent; reveals nothing about other teachers' files.
      await this.notes.update({ teacherId, fileId }, { status: 'deleting' });
      try {
        await this.pinecone.deleteDocument(teacherId, fileId, note.chunkCount);
        await this.storage.deleteFile(teacherId, note.objectKey);
        await this.notes.delete({ teacherId, fileId });
      } catch (error) {
        throw new NoteOperationError(
          'Your note could not be fully removed. Please retry deleting it.',
          error,
        );
      }
    });
  }

  async deleteDocuments(
    teacherId: string,
    fileIds: string[],
  ): Promise<{ deleted: string[]; failed: string[] }> {
    requireTeacherId(teacherId);
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

  private async findNote(
    teacherId: string,
    fileId: string,
  ): Promise<TeacherNote> {
    const note = await this.notes.findOneBy({
      teacherId: requireTeacherId(teacherId),
      fileId,
    });
    if (!note) throw new NotFoundException('Note not found.');
    return note;
  }

  private summary(note: TeacherNote): NoteSummary {
    const { fileId, fileName, size, chunkCount, status, createdAt } = note;
    return { fileId, fileName, size, chunkCount, status, createdAt };
  }

  private async withNoteLock<T>(
    fileId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.database.transaction(async (manager) => {
      const [result] = await manager.query<Array<{ locked: boolean }>>(
        'SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS locked',
        [`note:${fileId}`],
      );
      if (!result.locked)
        throw new NoteOperationError(
          'This note is being updated. Please try again shortly.',
        );
      // Status writes deliberately commit independently so retrieval sees them immediately.
      return operation();
    });
  }
}
