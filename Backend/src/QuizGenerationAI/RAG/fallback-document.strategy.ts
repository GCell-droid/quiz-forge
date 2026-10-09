import { Injectable, Logger } from '@nestjs/common';
import { DocumentProcessorStrategy, ProcessedChunk } from './rag.interfaces';
import { UnstructuredDocumentStrategy } from './unstructured-document.strategy';
import { LocalDocumentStrategy } from './local-document.strategy';

@Injectable()
export class FallbackDocumentStrategy implements DocumentProcessorStrategy {
  private readonly logger = new Logger(FallbackDocumentStrategy.name);
  private strategies: DocumentProcessorStrategy[];

  constructor(
    private unstructuredStrategy: UnstructuredDocumentStrategy,
    private localStrategy: LocalDocumentStrategy,
  ) {
    // Priority: try Unstructured API first, then fallback to Local processing
    this.strategies = [this.unstructuredStrategy, this.localStrategy];
  }

  async parsePipeline(file: Express.Multer.File): Promise<ProcessedChunk[]> {
    let lastError: any;

    for (const strategy of this.strategies) {
      try {
        this.logger.log(`Attempting to process document with ${strategy.constructor.name}`);
        const result = await strategy.parsePipeline(file);
        this.logger.log(`Successfully processed document with ${strategy.constructor.name}`);
        return result;
      } catch (error) {
        this.logger.warn(`Strategy ${strategy.constructor.name} failed: ${error.message}`);
        lastError = error;
      }
    }

    this.logger.error('All document processing strategies failed.');
    throw lastError;
  }
}
