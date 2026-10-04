import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class DocumentParserService {
  async parse(file: Express.Multer.File): Promise<string> {
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
        throw new BadRequestException(
          'This PDF could not be read. Please choose a text-based PDF.',
        );
      } finally {
        await parser.destroy();
      }
    } else if (
      mime.startsWith('text/') ||
      name.endsWith('.txt') ||
      name.endsWith('.md') ||
      name.endsWith('.csv') ||
      mime === 'application/json'
    ) {
      text = file.buffer.toString('utf-8');
    } else {
      throw new BadRequestException(
        `Unsupported document format: ${file.mimetype || 'unknown'}. Supported formats: PDF, TXT, MD, CSV`,
      );
    }

    const trimmed = text.trim();
    if (trimmed.length < 20) {
      throw new BadRequestException(
        'Could not extract sufficient text from the uploaded document',
      );
    }

    return trimmed;
  }
}
