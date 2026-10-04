import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { GeminiEmbeddingService } from './gemini-embedding.service';
import { requireTeacherId } from './note.errors';

export interface RetrievedChunk {
  score: number;
  text: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
}

@Injectable()
export class PineconeService implements OnModuleInit {
  private readonly pinecone: Pinecone;
  private readonly indexName: string;

  constructor(
    config: ConfigService,
    private readonly embeddings: GeminiEmbeddingService,
  ) {
    const apiKey =
      config.get<string>('PINECONE_API_KEY') ||
      config.get<string>('PINECONE_KEY');
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY or PINECONE_KEY is required');
    }
    this.pinecone = new Pinecone({ apiKey });
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
      namespace: `teacher_${requireTeacherId(teacherId)}`,
      maxConcurrency: 2,
    });
  }

  async upsertChunks(
    teacherId: string,
    fileId: string,
    fileName: string,
    chunks: string[],
  ): Promise<void> {
    const store = this.store(teacherId);
    // Bound embedding/upsert batches without silently truncating long documents.
    const batchSize = 32;
    for (let offset = 0; offset < chunks.length; offset += batchSize) {
      const documents = chunks.slice(offset, offset + batchSize).map((text, i) => ({
        pageContent: text,
        metadata: { fileId, fileName, teacherId, text, chunkIndex: offset + i },
      }));
      await store.addDocuments(documents, {
        ids: documents.map((_, i) => `${fileId}#chunk_${offset + i}`),
      });
      // Pacing pause between batches to avoid burst rate limits on Gemini
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
