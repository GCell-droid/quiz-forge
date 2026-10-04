import { ConfigService } from '@nestjs/config';
import { GeminiEmbeddingService } from './gemini-embedding.service';

describe('GeminiEmbeddingService', () => {
  let service: GeminiEmbeddingService;
  let mockEmbed: jest.Mock;

  beforeEach(() => {
    mockEmbed = jest.fn();
    const config = new ConfigService({
      PINECONE_KEY: 'mock-key',
    });
    service = new GeminiEmbeddingService(config);

    // Mock pinecone.inference.embed
    (service as any).pinecone = {
      inference: {
        embed: mockEmbed,
      },
    };
  });

  it('embeds documents successfully with 1024 dimensions and passage inputType', async () => {
    mockEmbed.mockResolvedValueOnce({
      data: [
        { values: new Array(1024).fill(0.1) },
        { values: new Array(1024).fill(0.2) },
      ],
    });

    const vectors = await service.embedDocuments(['Hello', 'World']);
    expect(vectors).toHaveLength(2);
    expect(vectors[0]).toHaveLength(1024);
    expect(vectors[1]).toHaveLength(1024);
    expect(mockEmbed).toHaveBeenCalledWith(
      'multilingual-e5-large',
      ['Hello', 'World'],
      { inputType: 'passage', truncate: 'END' },
    );
  });

  it('embeds query using query inputType with 1024 dimensions', async () => {
    mockEmbed.mockResolvedValueOnce({
      data: [{ values: new Array(1024).fill(0.5) }],
    });

    const vector = await service.embedQuery('test query');
    expect(vector).toHaveLength(1024);
    expect(vector[0]).toBe(0.5);
    expect(mockEmbed).toHaveBeenCalledWith(
      'multilingual-e5-large',
      ['test query'],
      { inputType: 'query', truncate: 'END' },
    );
  });

  it('retries on transient failure and succeeds', async () => {
    mockEmbed
      .mockRejectedValueOnce(new Error('Network reset'))
      .mockResolvedValueOnce({
        data: [{ values: new Array(1024).fill(0.3) }],
      });

    const vectors = await service.embedDocuments(['test']);
    expect(vectors).toHaveLength(1);
    expect(mockEmbed).toHaveBeenCalledTimes(2);
  });
});
