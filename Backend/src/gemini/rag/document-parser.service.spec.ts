import { BadRequestException } from '@nestjs/common';
import { DocumentParserService } from './document-parser.service';

describe('DocumentParserService', () => {
  let service: DocumentParserService;

  beforeEach(() => {
    service = new DocumentParserService();
  });

  it('rejects empty or missing files', async () => {
    await expect(
      service.parse(null as unknown as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.parse({
        buffer: Buffer.from(''),
        mimetype: 'text/plain',
        originalname: 'test.txt',
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('parses plain text and markdown files', async () => {
    const content =
      'This is a valid long educational content for building high quality quizzes.';
    const file = {
      buffer: Buffer.from(content),
      mimetype: 'text/plain',
      originalname: 'notes.txt',
    } as Express.Multer.File;

    const result = await service.parse(file);
    expect(result).toBe(content);
  });

  it('rejects unsupported file types', async () => {
    const file = {
      buffer: Buffer.from('binary-data-that-is-not-supported'),
      mimetype: 'application/octet-stream',
      originalname: 'test.exe',
    } as Express.Multer.File;

    await expect(service.parse(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
