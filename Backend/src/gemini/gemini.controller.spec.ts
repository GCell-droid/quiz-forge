import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { GeminiController } from './gemini.controller';
import { QuizDifficulty } from './dto/generate-quiz.dto';
import { RagPipelineService } from './rag/rag-pipeline.service';

describe('GeminiController', () => {
  const generated = {
    title: 'Quiz',
    description: 'Description',
    questions: [],
  };
  const user = { userId: 'teacher-1' };
  function setup() {
    const generator = { generate: jest.fn().mockResolvedValue(generated) };
    const notes = {
      ingestDocument: jest.fn().mockResolvedValue({ fileId: 'note-1' }),
      retrieveContext: jest
        .fn()
        .mockResolvedValue({ context: 'Excerpt', validChunkCount: 1 }),
    };
    return {
      generator,
      notes,
      controller: new GeminiController(
        generator,
        notes as unknown as RagPipelineService,
      ),
    };
  }
  it('retrieves saved notes for topic-only requests using the authenticated teacher', async () => {
    const { controller, generator, notes } = setup();
    await expect(
      controller.generateQuiz(
        {
          topic: 'TypeScript',
          questionCount: 4,
          difficulty: QuizDifficulty.EASY,
        },
        user,
      ),
    ).resolves.toBe(generated);
    expect(notes.retrieveContext).toHaveBeenCalledWith(
      'TypeScript',
      'teacher-1',
      4,
      undefined,
    );
    expect(generator.generate).toHaveBeenCalledWith({
      topic: 'TypeScript',
      numQuestions: 4,
      difficulty: 'easy',
      context: 'Excerpt',
      validChunkCount: 1,
    });
  });
  it('stores an uploaded document and restricts generation to it', async () => {
    const { controller, notes } = setup();
    const file = {
      buffer: Buffer.from('Biology study material'),
      originalname: 'biology.txt',
    } as Express.Multer.File;
    await controller.generateQuiz(
      { topic: 'Enzymes', numQuestions: 5 },
      user,
      file,
    );
    expect(notes.ingestDocument).toHaveBeenCalledWith(file, 'teacher-1');
    expect(notes.retrieveContext).toHaveBeenCalledWith(
      'Enzymes',
      'teacher-1',
      5,
      'note-1',
    );
  });
  it('rejects missing authentication before accessing notes', async () => {
    const { controller, notes } = setup();
    await expect(
      controller.generateQuiz({ topic: 'Biology' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(notes.retrieveContext).not.toHaveBeenCalled();
  });
  it('rejects missing topics without a file', async () => {
    const { controller } = setup();
    await expect(
      controller.generateQuiz({ topic: '' }, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
