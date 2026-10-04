import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Embeddings } from '@langchain/core/embeddings';
import { Pinecone } from '@pinecone-database/pinecone';

@Injectable()
export class GeminiEmbeddingService extends Embeddings {
  private readonly logger = new Logger(GeminiEmbeddingService.name);
  private readonly pinecone: Pinecone;
  private readonly model = 'multilingual-e5-large';

  constructor(config: ConfigService) {
    super({});
    const apiKey =
      config.get<string>('PINECONE_API_KEY') ||
      config.getOrThrow<string>('PINECONE_KEY');
    this.pinecone = new Pinecone({ apiKey });
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];

    const maxRetries = 3;
    const batchSize = 64;
    const allVectors: number[][] = [];

    for (let offset = 0; offset < texts.length; offset += batchSize) {
      const batch = texts.slice(offset, offset + batchSize);
      let success = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await this.pinecone.inference.embed(
            this.model,
            batch,
            { inputType: 'passage', truncate: 'END' },
          );

          const vectors: number[][] = (response.data || []).map((item) => {
            if ('values' in item && Array.isArray(item.values)) {
              return item.values as number[];
            }
            return [];
          });

          const isValid =
            vectors.length === batch.length &&
            vectors.every(
              (v) => v.length === 1024 && v.every(Number.isFinite),
            );

          if (isValid) {
            allVectors.push(...vectors);
            success = true;
            break;
          }

          this.logger.warn(
            `Pinecone embedding batch of ${batch.length} returned invalid vectors (attempt ${attempt}/${maxRetries}). Retrying...`,
          );
        } catch (err) {
          this.logger.warn(
            `Pinecone embedding batch of ${batch.length} failed (attempt ${attempt}/${maxRetries}): ${err instanceof Error ? err.message : String(err)}. Retrying...`,
          );
          if (attempt < maxRetries) {
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)),
            );
          }
        }
      }

      if (!success) {
        throw new Error('Study material could not be prepared');
      }
    }

    return allVectors;
  }

  async embedQuery(document: string): Promise<number[]> {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.pinecone.inference.embed(
          this.model,
          [document],
          { inputType: 'query', truncate: 'END' },
        );

        const first = response.data?.[0];
        if (first && 'values' in first && Array.isArray(first.values)) {
          const vector = first.values as number[];
          if (vector.length === 1024 && vector.every(Number.isFinite)) {
            return vector;
          }
        }
      } catch (err) {
        this.logger.warn(
          `Pinecone query embedding failed (attempt ${attempt}/${maxRetries}): ${err instanceof Error ? err.message : String(err)}`,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * Math.pow(2, attempt - 1)),
          );
        }
      }
    }

    throw new Error('Failed to generate embedding for query');
  }
}
