import { QuestionType } from '../../quizzes/entities/question.entity/question.entity';
import { DefaultAnswerScorer } from './default-answer.scorer';

describe('DefaultAnswerScorer', () => {
  const scorer = new DefaultAnswerScorer();

  it('normalizes text answers and awards configured points', () => {
    expect(
      scorer.score(
        {
          type: QuestionType.MULTIPLE_CHOICE,
          correctAnswer: ' Option A ',
          points: 3,
        },
        'option a',
      ),
    ).toEqual({ isCorrect: true, pointsScored: 3 });
  });

  it('awards zero points for an incorrect answer', () => {
    expect(
      scorer.score(
        {
          type: QuestionType.TRUE_FALSE,
          correctAnswer: true,
          points: 2,
        },
        'false',
      ),
    ).toEqual({ isCorrect: false, pointsScored: 0 });
  });
});
