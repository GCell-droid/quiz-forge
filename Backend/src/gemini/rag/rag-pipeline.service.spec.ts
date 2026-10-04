import { DataSource, Repository } from 'typeorm';
import { RagPipelineService } from './rag-pipeline.service';
import { DocumentParserService } from './document-parser.service';
import { TextSplitterService } from './text-splitter.service';
import { PineconeService } from './pinecone.service';
import { BackblazeStorageService } from './backblaze-storage.service';
import { TeacherNote } from './note.entity';
import { NoteOperationError } from './note.errors';

describe('RagPipelineService', () => {
  function setup() {
    const note = {
      fileId: 'note-1',
      teacherId: 'teacher-1',
      objectKey: 'teachers/teacher-1/notes/note-1-doc.txt',
      fileName: 'doc.txt',
      size: 100,
      chunkCount: 2,
      status: 'ready',
      createdAt: new Date(),
    };
    const parser = { parse: jest.fn().mockResolvedValue('Study material') };
    const splitter = {
      splitText: jest
        .fn()
        .mockResolvedValue(['First excerpt', 'Second excerpt']),
    };
    const pinecone = {
      upsertChunks: jest.fn(),
      query: jest.fn().mockResolvedValue([]),
      deleteDocument: jest.fn(),
    };
    const storage = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      objectKey: jest.fn().mockReturnValue(note.objectKey),
      usage: jest.fn().mockResolvedValue(100),
      downloadUrl: jest.fn(),
    };
    const repository = {
      create: jest.fn((value: object) => ({
        ...value,
        createdAt: note.createdAt,
      })),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOneBy: jest.fn().mockResolvedValue(note),
      find: jest.fn().mockResolvedValue([note]),
    };
    const query = jest.fn().mockResolvedValue([{ locked: true }]);
    const database = {
      transaction: jest.fn(
        async (fn: (manager: { query: typeof query }) => Promise<unknown>) =>
          fn({ query }),
      ),
    };
    const service = new RagPipelineService(
      parser as unknown as DocumentParserService,
      splitter as unknown as TextSplitterService,
      pinecone as unknown as PineconeService,
      storage as unknown as BackblazeStorageService,
      repository as unknown as Repository<TeacherNote>,
      database as unknown as DataSource,
    );
    return {
      service,
      parser,
      splitter,
      pinecone,
      storage,
      repository,
      note,
      query,
    };
  }
  it('persists chunk count before indexing and uses the same file ID throughout', async () => {
    const { service, repository, pinecone, storage } = setup();
    const file = {
      buffer: Buffer.from('valid study content'),
      originalname: 'doc.txt',
    } as Express.Multer.File;
    const result = await service.ingestDocument(file, 'teacher-1');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: result.fileId,
        chunkCount: 2,
        status: 'processing',
      }),
    );
    expect(storage.uploadFile).toHaveBeenCalledWith(
      file,
      'teacher-1',
      expect.any(String),
    );
    expect(pinecone.upsertChunks).toHaveBeenCalledWith(
      'teacher-1',
      result.fileId,
      'doc.txt',
      ['First excerpt', 'Second excerpt'],
    );
    expect(result.status).toBe('ready');
  });
  it('keeps a failed upload discoverable and never marks it ready', async () => {
    const { service, repository, pinecone } = setup();
    pinecone.upsertChunks.mockRejectedValueOnce(
      new Error('partial batch failure'),
    );
    await expect(
      service.ingestDocument(
        {
          buffer: Buffer.from('test content'),
          originalname: 'doc.txt',
        } as Express.Multer.File,
        'teacher-1',
      ),
    ).rejects.toBeInstanceOf(NoteOperationError);
    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: 'teacher-1' }),
      { status: 'failed' },
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
  it('uses topK=N, includes the threshold boundary, and excludes stale/duplicate/foreign results', async () => {
    const { service, pinecone } = setup();
    const match = {
      fileId: 'note-1',
      fileName: 'doc.txt',
      text: 'Excerpt',
      score: 0.3,
      chunkIndex: 0,
    };
    pinecone.query.mockResolvedValue([
      match,
      match,
      { ...match, chunkIndex: 1, score: 0.29 },
      { ...match, fileId: 'foreign', score: 0.9 },
    ]);
    await expect(
      service.retrieveContext('Biology', 'teacher-1', 4),
    ).resolves.toEqual({
      validChunkCount: 1,
      context: 'Excerpt 1 (doc.txt):\nExcerpt',
    });
    expect(pinecone.query).toHaveBeenCalledWith('teacher-1', 'Biology', 4, [
      'note-1',
    ]);
  });
  it('does not silently treat a retrieval outage as absent notes', async () => {
    const { service, pinecone } = setup();
    pinecone.query.mockRejectedValue(new Error('offline'));
    await expect(
      service.retrieveContext('Biology', 'teacher-1', 2),
    ).rejects.toThrow('offline');
  });
  it('preserves the blob if vector deletion fails', async () => {
    const { service, pinecone, storage, repository } = setup();
    pinecone.deleteDocument.mockRejectedValueOnce(new Error('offline'));
    await expect(
      service.deleteDocument('teacher-1', 'note-1'),
    ).rejects.toBeInstanceOf(NoteOperationError);
    expect(repository.update).toHaveBeenCalledWith(
      { teacherId: 'teacher-1', fileId: 'note-1' },
      { status: 'deleting' },
    );
    expect(storage.deleteFile).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });
  it('retains the record after a blob failure and permits retry', async () => {
    const { service, pinecone, storage, repository, note } = setup();
    storage.deleteFile.mockRejectedValueOnce(new Error('offline'));
    await expect(
      service.deleteDocument('teacher-1', 'note-1'),
    ).rejects.toBeInstanceOf(NoteOperationError);
    expect(repository.delete).not.toHaveBeenCalled();
    await service.deleteDocument('teacher-1', 'note-1');
    expect(pinecone.deleteDocument).toHaveBeenCalledWith(
      'teacher-1',
      'note-1',
      2,
    );
    expect(storage.deleteFile).toHaveBeenCalledWith(
      'teacher-1',
      note.objectKey,
    );
    expect(pinecone.deleteDocument.mock.invocationCallOrder[0]).toBeLessThan(
      storage.deleteFile.mock.invocationCallOrder[0],
    );
    expect(repository.delete).toHaveBeenCalledWith({
      teacherId: 'teacher-1',
      fileId: 'note-1',
    });
  });
  it("never deletes another teacher's note", async () => {
    const { service, repository, pinecone, storage } = setup();
    repository.findOneBy.mockResolvedValue(null);
    await service.deleteDocument('teacher-2', 'note-1');
    expect(repository.findOneBy).toHaveBeenCalledWith({
      teacherId: 'teacher-2',
      fileId: 'note-1',
    });
    expect(pinecone.deleteDocument).not.toHaveBeenCalled();
    expect(storage.deleteFile).not.toHaveBeenCalled();
  });
  it('rejects concurrent mutations before touching storage', async () => {
    const { service, query, storage } = setup();
    query.mockResolvedValue([{ locked: false }]);
    await expect(
      service.deleteDocument('teacher-1', 'note-1'),
    ).rejects.toBeInstanceOf(NoteOperationError);
    expect(storage.deleteFile).not.toHaveBeenCalled();
  });
});
