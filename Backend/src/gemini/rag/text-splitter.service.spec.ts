import { TextSplitterService } from './text-splitter.service';

describe('TextSplitterService', () => {
  let service: TextSplitterService;

  beforeEach(() => {
    service = new TextSplitterService();
  });

  it('returns empty array for empty string', async () => {
    expect(await service.splitText('')).toEqual([]);
    expect(await service.splitText('   ')).toEqual([]);
  });

  it('returns single chunk when text is short', async () => {
    const text = 'Short document content for testing';
    const chunks = await service.splitText(text);
    expect(chunks).toEqual([text]);
  });

  it('splits long text into chunks using LangChain RecursiveCharacterTextSplitter', async () => {
    const paragraph =
      'Photosynthesis is a fundamental biological process in green plants. '.repeat(
        40,
      );
    const chunks = await service.splitText(paragraph);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]).toContain('Photosynthesis');
  });
});
