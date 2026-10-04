import { UnauthorizedException } from '@nestjs/common';
import { TeacherNotesController } from './teacher-notes.controller';
import { RagPipelineService } from './rag-pipeline.service';

describe('TeacherNotesController', () => {
  const teacherUser = { userId: 'teacher-uuid-123' };
  let controller: TeacherNotesController;
  let notesService: {
    list: jest.Mock;
    ingestDocument: jest.Mock;
    download: jest.Mock;
    deleteDocument: jest.Mock;
  };

  beforeEach(() => {
    notesService = {
      list: jest.fn().mockResolvedValue({ notes: [], usedBytes: 0, limitBytes: 209715200 }),
      ingestDocument: jest.fn().mockResolvedValue({ fileId: 'doc-uuid', fileName: 'test.pdf' }),
      download: jest.fn().mockResolvedValue({ url: 'https://download-url', expiresIn: 900 }),
      deleteDocument: jest.fn().mockResolvedValue(undefined),
      deleteDocuments: jest.fn().mockResolvedValue({ deleted: ['file-1'], failed: [] }),
      storageSummary: jest.fn().mockResolvedValue({ count: 1, usedBytes: 1024, limitBytes: 209715200 }),
    };
    controller = new TeacherNotesController(notesService as unknown as RagPipelineService);
  });

  describe('storage', () => {
    it('returns storage summary for authenticated teacher', async () => {
      const result = await controller.storage(teacherUser);
      expect(notesService.storageSummary).toHaveBeenCalledWith('teacher-uuid-123');
      expect(result).toHaveProperty('usedBytes', 1024);
    });
  });

  describe('batchDelete', () => {
    it('batch deletes documents for authenticated teacher', async () => {
      const result = await controller.batchDelete(teacherUser, {
        fileIds: ['00000000-0000-0000-0000-000000000001'],
      });
      expect(notesService.deleteDocuments).toHaveBeenCalledWith('teacher-uuid-123', [
        '00000000-0000-0000-0000-000000000001',
      ]);
      expect(result).toHaveProperty('deleted');
    });
  });

  describe('list', () => {
    it('returns notes listing for the authenticated teacher', async () => {
      const result = await controller.list(teacherUser);
      expect(notesService.list).toHaveBeenCalledWith('teacher-uuid-123');
      expect(result).toHaveProperty('notes');
    });

    it('rejects unauthenticated requests', () => {
      expect(() => controller.list(undefined as any)).toThrow(UnauthorizedException);
      expect(() => controller.list({ userId: '' } as any)).toThrow(UnauthorizedException);
    });
  });

  describe('upload', () => {
    it('ingests uploaded document for authenticated teacher', async () => {
      const file = {
        buffer: Buffer.from('content'),
        originalname: 'notes.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      const result = await controller.upload(teacherUser, file);
      expect(notesService.ingestDocument).toHaveBeenCalledWith(file, 'teacher-uuid-123');
      expect(result).toHaveProperty('fileId', 'doc-uuid');
    });

    it('rejects upload without valid teacher identity', () => {
      const file = { buffer: Buffer.from('abc') } as Express.Multer.File;
      expect(() => controller.upload({ userId: 'invalid chars!!' } as any, file)).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('download', () => {
    it('returns download url for valid fileId and teacher', async () => {
      const result = await controller.download(teacherUser, 'file-uuid-456');
      expect(notesService.download).toHaveBeenCalledWith('teacher-uuid-123', 'file-uuid-456');
      expect(result).toHaveProperty('url', 'https://download-url');
    });
  });

  describe('delete', () => {
    it('deletes document for valid fileId and teacher', async () => {
      await controller.delete(teacherUser, 'file-uuid-456');
      expect(notesService.deleteDocument).toHaveBeenCalledWith('teacher-uuid-123', 'file-uuid-456');
    });
  });
});
