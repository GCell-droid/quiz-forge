import { QuizzesController } from './quizzes.controller';
import { BundlesController } from './bundles.controller';

describe('QuizzesController', () => {
  it('passes the authenticated user to quiz creation', () => {
    const createQuiz = jest.fn().mockReturnValue({ quizId: 'quiz-1' });
    const controller = new QuizzesController({ createQuiz } as never);
    const dto = { title: 'Quiz' } as never;

    expect(controller.createQuiz({ userId: 'teacher-1' }, dto)).toEqual({
      quizId: 'quiz-1',
    });
    expect(createQuiz).toHaveBeenCalledWith('teacher-1', dto);
  });
});

describe('paginated lists', () => {
  it('scopes created quizzes to the teacher and passes validated pagination', () => {
    const getAllQuizzes = jest.fn();
    const controller = new QuizzesController({ getAllQuizzes } as never);
    controller.getAllQuizzes({ userId: 'teacher-1' }, undefined, '2', '10');
    expect(getAllQuizzes).toHaveBeenCalledWith(
      { page: 2, pageSize: 10 },
      'teacher-1',
    );
  });

  it('filters public bundles and keeps pagination separate from ownership', () => {
    const getAllBundles = jest.fn();
    const controller = new BundlesController({ getAllBundles } as never);
    controller.getAllBundles(
      { userId: 'teacher-1' },
      'true',
      'math,science',
      '3',
      '12',
    );
    expect(getAllBundles).toHaveBeenCalledWith(
      { page: 3, pageSize: 12 },
      undefined,
      ['math', 'science'],
    );
  });
});
