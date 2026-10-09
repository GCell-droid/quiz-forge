import { QuestionType } from '../../quizzes/entities/question.entity/question.entity';

export const ANSWER_SCORER = Symbol('ANSWER_SCORER');

export interface ScoredQuestion {
  type: QuestionType;
  correctAnswer: unknown;
  points: number;
}

export interface AnswerScorer {
  score(
    question: ScoredQuestion,
    response: string,
  ): {
    isCorrect: boolean;
    pointsScored: number;
  };
}
