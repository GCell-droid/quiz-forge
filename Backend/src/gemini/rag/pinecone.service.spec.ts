import { ConfigService } from '@nestjs/config';
import { PineconeStore } from '@langchain/pinecone';
import { PineconeService } from './pinecone.service';
import { GeminiEmbeddingService } from './gemini-embedding.service';

jest.mock('@langchain/pinecone', () => ({ PineconeStore: jest.fn() }));
jest.mock('@pinecone-database/pinecone', () => ({
  Pinecone: jest
    .fn()
    .mockImplementation(() => ({ index: jest.fn().mockReturnValue({}) })),
}));

describe('PineconeService', () => {
  const addDocuments = jest.fn().mockResolvedValue([]);
  const remove = jest.fn().mockResolvedValue(undefined);
  const similaritySearchWithScore = jest.fn().mockResolvedValue([]);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(PineconeStore).mockImplementation(
      () =>
        ({
          addDocuments,
          delete: remove,
          similaritySearchWithScore,
        }) as unknown as PineconeStore,
    );
  });
  function service() {
    return new PineconeService(
      new ConfigService({
        PINECONE_API_KEY: 'test',
        PINECONE_INDEX_NAME: 'notes',
      }),
      {} as GeminiEmbeddingService,
    );
  }
  it('uses isolated namespaces, deterministic IDs, and full metadata without truncation', async () => {
    const chunks = Array.from({ length: 105 }, (_, i) => `text-${i}`);
    await service().upsertChunks('teacher-1', 'file-1', 'notes.txt', chunks);
    expect(PineconeStore).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ namespace: 'teacher_teacher-1' }),
    );
    expect(addDocuments).toHaveBeenCalledTimes(4);
    expect(addDocuments).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        {
          pageContent: 'text-104',
          metadata: {
            teacherId: 'teacher-1',
            fileId: 'file-1',
            fileName: 'notes.txt',
            text: 'text-104',
            chunkIndex: 104,
          },
        },
      ]),
      { ids: Array.from({ length: 9 }, (_, i) => `file-1#chunk_${96 + i}`) },
    );
  });
  it('uses scored topK retrieval with tenant and file filters', async () => {
    await service().query('teacher-2', 'Cells', 7, ['file-2']);
    expect(PineconeStore).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ namespace: 'teacher_teacher-2' }),
    );
    expect(similaritySearchWithScore).toHaveBeenCalledWith('Cells', 7, {
      teacherId: { $eq: 'teacher-2' },
      fileId: { $in: ['file-2'] },
    });
  });
  it('deletes by deterministic IDs and propagates errors', async () => {
    await service().deleteDocument('teacher-2', 'file-2', 1002);
    expect(remove).toHaveBeenLastCalledWith({
      ids: ['file-2#chunk_1000', 'file-2#chunk_1001'],
    });
    remove.mockRejectedValueOnce(new Error('offline'));
    await expect(
      service().deleteDocument('teacher-2', 'file-2', 2),
    ).rejects.toThrow('offline');
  });
});
