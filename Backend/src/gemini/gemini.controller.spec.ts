import { GeminiController } from './gemini.controller';
import { QuizDifficulty } from './dto/generate-quiz.dto';

describe('GeminiController', () => {
  it('delegates generation through the replaceable generator port', async () => {
    const generated = {
      title: 'Quiz',
      description: 'Description',
      questions: [],
    };
    const generator = { generate: jest.fn().mockResolvedValue(generated) };
    const controller = new GeminiController(generator);

    await expect(
      controller.generateQuiz({
        topic: 'TypeScript',
        numQuestions: 4,
        difficulty: QuizDifficulty.EASY,
      }),
    ).resolves.toBe(generated);
    expect(generator.generate).toHaveBeenCalledWith({
      topic: 'TypeScript',
      numQuestions: 4,
      difficulty: 'easy',
    });
  });
});
