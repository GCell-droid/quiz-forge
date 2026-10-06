export const BLOB_STORAGE = Symbol('BLOB_STORAGE');
export const VECTOR_STORE = Symbol('VECTOR_STORE');
export const DOCUMENT_PROCESSOR = Symbol('DOCUMENT_PROCESSOR');

export interface ProcessedChunk {
  type: 'text' | 'table' | 'image';
  text: string;
  metadata?: {
    html?: string;
    base64?: string;
  };
}

export interface DocumentProcessorStrategy {
  parsePipeline(file: Express.Multer.File): Promise<ProcessedChunk[]>;
}

export interface BlobStorage {
  uploadFile(file: Express.Multer.File, key: string): Promise<void>;
  uploadBase64(base64: string, key: string): Promise<void>;
  downloadUrl(key: string): Promise<string>;
  downloadBase64(key: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
  deleteFolder(prefix: string): Promise<void>;
}

export interface RetrievedChunk {
  score: number;
  text: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
  html?: string;
  imageUrl?: string;
}

export interface VectorStore {
  upsertChunks(
    teacherId: string,
    fileId: string,
    fileName: string,
    chunks: { text: string; metadata?: Record<string, any> }[]
  ): Promise<void>;
  
  query(
    teacherId: string,
    topic: string,
    topK: number,
    fileIds: string[]
  ): Promise<RetrievedChunk[]>;
  
  deleteDocument(
    teacherId: string,
    fileId: string,
    chunkCount: number
  ): Promise<void>;
}
