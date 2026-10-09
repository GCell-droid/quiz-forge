import { BadRequestException } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';

describe('QuizzesService creation', () => {
  it('copies bundle questions in selected bundle order with sequential positions', async () => {
    const quizzes = {
      createWithQuestions: jest.fn().mockResolvedValue({ quizId: 'quiz-1' }),
    };
    const bundles = {
      getBundles: jest.fn().mockResolvedValue([
        {
          bundleId: 'b2',
          questions: [
            {
              displayOrder: 1,
              question: {
                title: 'B',
                type: 'TRUE_FALSE',
                options: ['True', 'False'],
                correctAnswer: 'True',
                points: 1,
              },
            },
          ],
        },
        {
          bundleId: 'b1',
          questions: [
            {
              displayOrder: 1,
              question: {
                title: 'A',
                type: 'TRUE_FALSE',
                options: ['True', 'False'],
                correctAnswer: 'False',
                points: 2,
              },
            },
          ],
        },
      ]),
    };
    const service = new QuizzesService(quizzes as never, bundles as never);
    const dto = { title: 'Quiz', bundleIds: ['b1', 'b2'] } as never;

    await service.createQuiz('teacher-1', dto);

    expect(quizzes.createWithQuestions).toHaveBeenCalledWith('teacher-1', dto, [
      expect.objectContaining({ title: 'A', displayOrder: 1 }),
      expect.objectContaining({ title: 'B', displayOrder: 2 }),
    ]);
  });

  it('does not persist an empty quiz', async () => {
    const quizzes = { createWithQuestions: jest.fn() };
    const service = new QuizzesService(quizzes as never, {} as never);
    await expect(
      service.createQuiz('teacher-1', { title: 'Quiz' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(quizzes.createWithQuestions).not.toHaveBeenCalled();
  });

  it('checks ownership without loading every question for metadata updates', async () => {
    const quizzes = {
      findOwnerId: jest.fn().mockResolvedValue('teacher-1'),
      updateMetadata: jest.fn().mockResolvedValue({ quizId: 'quiz-1' }),
      findById: jest.fn(),
    };
    const service = new QuizzesService(quizzes as never, {} as never);
    const update = { title: 'Renamed' } as never;

    await expect(
      service.updateQuiz('teacher-1', 'quiz-1', update),
    ).resolves.toEqual({ quizId: 'quiz-1' });
    expect(quizzes.findOwnerId).toHaveBeenCalledWith('quiz-1');
    expect(quizzes.findById).not.toHaveBeenCalled();
  });
});
