import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

@Injectable()
export class TextSplitterService {
  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', '? ', '! ', ' ', ''],
  });

  async splitText(text: string): Promise<string[]> {
    if (!text || !text.trim()) {
      return [];
    }
    const cleaned = this.cleanStructuralNoise(text);
    return this.splitter.splitText(cleaned);
  }

  private cleanStructuralNoise(text: string): string {
    return (
      text
        // Strip standalone page numbers like "Page 1", "Page 1 of 20", "--- 12 ---", "p. 45"
        .replace(
          /^[ \t]*(?:page|p\.)\s*\d+(?:\s*(?:of|\/)\s*\d+)?[ \t]*$/gim,
          '',
        )
        .replace(
          /^[ \t]*[-—–=]{2,}\s*(?:page\s*)?\d+\s*[-—–=]{2,}[ \t]*$/gim,
          '',
        )
        // Strip standalone unit/module/chapter headers on their own line
        .replace(/^[ \t]*(?:chapter|unit|module)\s+\d+[:\s\w]*$/gim, '')
        // Normalize line breaks
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    );
  }
}
