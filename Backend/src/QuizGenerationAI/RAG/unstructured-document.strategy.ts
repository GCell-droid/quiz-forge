import { BadRequestException, Injectable, RequestTimeoutException, InternalServerErrorException } from '@nestjs/common';
import { ProcessedChunk, DocumentProcessorStrategy } from './rag.interfaces';

@Injectable()
export class UnstructuredDocumentStrategy implements DocumentProcessorStrategy {
  async parsePipeline(file: Express.Multer.File): Promise<ProcessedChunk[]> {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty or missing');
    }

    try {
      const formData = new FormData();
      formData.append(
        'files',
        new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
        file.originalname,
      );
      formData.append('chunking_strategy', 'by_title');
      formData.append('strategy', 'hi_res');
      formData.append('pdf_infer_table_structure', 'true');
      formData.append('extract_image_block_types', '["Image", "Table"]');

      const apiUrl = process.env.UNSTRUCTURED_URL || 'https://api.unstructuredapp.io/general/v0/general';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'unstructured-api-key': process.env.UNSTRUCTURED_API || '',
        },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Unstructured API Error:', response.status, errText);
        throw new Error(`Unstructured API error: ${response.status}`);
      }

      const elements = await response.json();
      
      const chunks: ProcessedChunk[] = [];
      for (const el of elements) {
        if (!el.text || !el.text.trim()) continue;
        
        let type: ProcessedChunk['type'] = 'text';
        let metadata: ProcessedChunk['metadata'] = {};

        if (el.type === 'Table' || (el.metadata && el.metadata.text_as_html)) {
          type = 'table';
          metadata.html = el.metadata.text_as_html;
        } else if (el.type === 'Image' || (el.metadata && el.metadata.image_base64)) {
          type = 'image';
          metadata.base64 = el.metadata.image_base64;
        }

        chunks.push({ type, text: el.text, metadata });
      }

      if (chunks.length === 0) {
        throw new BadRequestException('Could not extract readable text from the document.');
      }

      return chunks;
    } catch (error: any) {
      console.error('Unstructured Document Pipeline Error:', error);
      
      // Handle Node.js / Undici fetch timeout errors
      if (error.code === 'UND_ERR_HEADERS_TIMEOUT' || error.cause?.code === 'UND_ERR_HEADERS_TIMEOUT') {
        throw new RequestTimeoutException('The document took too long to process. Please upload a smaller document with fewer pages.');
      }

      // Handle specific API status errors thrown by our check above
      if (error.message?.includes('Unstructured API error')) {
        throw new InternalServerErrorException(`Document parsing failed: ${error.message}`);
      }

      // Fallback for any other unexpected errors
      throw new InternalServerErrorException('Failed to process document with Unstructured API.');
    }
  }
}
