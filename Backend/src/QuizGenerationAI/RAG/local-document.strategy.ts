import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ProcessedChunk, DocumentProcessorStrategy } from './rag.interfaces';

@Injectable()
export class LocalDocumentStrategy implements DocumentProcessorStrategy {
  private splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', '? ', '! ', ' ', ''],
  });

  async parsePipeline(file: Express.Multer.File): Promise<ProcessedChunk[]> {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty or missing');
    }

    const mime = (file.mimetype || '').toLowerCase();
    const name = (file.originalname || '').toLowerCase();

    let text = '';
    if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      const parser = new PDFParse({ data: file.buffer });
      try {
        const res = await parser.getText();
        text = res.text || '';
      } catch {
        throw new BadRequestException('This PDF could not be read.');
      }
    } else {
      text = file.buffer.toString('utf-8');
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('Could not extract sufficient text from the document.');
    }

    const chunks = await this.splitter.splitText(trimmed);
    return chunks.map((text) => ({ type: 'text', text }));
  }
}
