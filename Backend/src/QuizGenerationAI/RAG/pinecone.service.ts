import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { Embeddings } from '@langchain/core/embeddings';
import { VectorStore, RetrievedChunk } from './rag.interfaces';



class PineconeInferenceEmbeddings extends Embeddings {
  private readonly logger = new Logger(PineconeInferenceEmbeddings.name);
  private readonly model = 'multilingual-e5-large';

  constructor(private readonly pinecone: Pinecone) {
    super({});
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
            vectors.every((v) => v.length === 1024 && v.every(Number.isFinite));
          if (isValid) {
            allVectors.push(...vectors);
            success = true;
            break;
          }
          this.logger.warn(`Pinecone embedding batch returned invalid vectors (attempt ${attempt}). Retrying...`);
        } catch (err) {
          this.logger.warn(`Pinecone embedding batch failed (attempt ${attempt}): ${err instanceof Error ? err.message : String(err)}. Retrying...`);
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
          }
        }
      }
      if (!success) throw new Error('Study material could not be prepared');
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
          if (vector.length === 1024 && vector.every(Number.isFinite)) return vector;
        }
      } catch (err) {
        this.logger.warn(`Pinecone query embedding failed (attempt ${attempt}): ${err instanceof Error ? err.message : String(err)}`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
        }
      }
    }
    throw new Error('Failed to generate embedding for query');
  }
}

@Injectable()
export class PineconeService implements OnModuleInit, VectorStore {
  private readonly pinecone: Pinecone;
  private readonly indexName: string;
  private readonly embeddings: PineconeInferenceEmbeddings;

  constructor(config: ConfigService) {
    const apiKey =
      config.get<string>('PINECONE_API_KEY') ||
      config.get<string>('PINECONE_KEY');
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY or PINECONE_KEY is required');
    }
    this.pinecone = new Pinecone({ apiKey });
    this.embeddings = new PineconeInferenceEmbeddings(this.pinecone);
    this.indexName = config.getOrThrow<string>('PINECONE_INDEX_NAME');
  }

  async onModuleInit(): Promise<void> {
    const index = await this.pinecone.describeIndex(this.indexName);
    if (index.dimension !== 1024 || index.metric !== 'cosine') {
      throw new Error('Teacher notes require a 1024-dimensional cosine index');
    }
  }

  private store(teacherId: string): PineconeStore {
    return new PineconeStore(this.embeddings, {
      pineconeIndex: this.pinecone.index(this.indexName),
      namespace: `teacher_${teacherId}`,
      maxConcurrency: 2,
    });
  }

  async upsertChunks(
    teacherId: string,
    fileId: string,
    fileName: string,
    chunks: { text: string; metadata?: Record<string, any> }[],
  ): Promise<void> {
    const store = this.store(teacherId);
    const batchSize = 32;
    for (let offset = 0; offset < chunks.length; offset += batchSize) {
      const documents = chunks.slice(offset, offset + batchSize).map((chunk, i) => ({
        pageContent: chunk.text,
        metadata: {
          fileId,
          fileName,
          teacherId,
          text: chunk.text,
          chunkIndex: offset + i,
          ...(chunk.metadata || {}),
        },
      }));
      await store.addDocuments(documents, {
        ids: documents.map((_, i) => `${fileId}#chunk_${offset + i}`),
      });
      if (offset + batchSize < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
  }

  async query(
    teacherId: string,
    topic: string,
    topK: number,
    fileIds: string[],
  ): Promise<RetrievedChunk[]> {
    if (fileIds.length === 0) return [];
    const results = await this.store(teacherId).similaritySearchWithScore(
      topic,
      topK,
      {
        teacherId: { $eq: teacherId },
        fileId: { $in: fileIds },
      },
    );
    return results.flatMap(([document, score]) => {
      const metadata = document.metadata;
      if (
        metadata.teacherId !== teacherId ||
        !fileIds.includes(String(metadata.fileId))
      )
        return [];
      return [
        {
          score,
          text: document.pageContent,
          fileId: String(metadata.fileId),
          fileName: String(metadata.fileName),
          chunkIndex: Number(metadata.chunkIndex),
          html: metadata.html ? String(metadata.html) : undefined,
          imageUrl: metadata.imageUrl ? String(metadata.imageUrl) : undefined,
        },
      ];
    });
  }

  async deleteDocument(
    teacherId: string,
    fileId: string,
    chunkCount: number,
  ): Promise<void> {
    const store = this.store(teacherId);
    for (let offset = 0; offset < chunkCount; offset += 1000) {
      await store.delete({
        ids: Array.from(
          { length: Math.min(1000, chunkCount - offset) },
          (_, i) => `${fileId}#chunk_${offset + i}`,
        ),
      });
    }
  }
}
