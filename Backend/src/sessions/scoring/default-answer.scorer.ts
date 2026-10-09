import { Injectable } from '@nestjs/common';
import { AnswerScorer, ScoredQuestion } from '../ports/answer-scoring.port';

@Injectable()
export class DefaultAnswerScorer implements AnswerScorer {
  score(question: ScoredQuestion, response: string) {
    const answer = question.correctAnswer;
    let isCorrect = false;

    if (typeof answer === 'string') {
      isCorrect = answer.trim().toLowerCase() === response.trim().toLowerCase();
    } else if (typeof answer === 'number') {
      isCorrect = answer === Number(response);
    } else if (typeof answer === 'boolean') {
      isCorrect = answer === (response.toLowerCase() === 'true');
    } else {
      isCorrect = JSON.stringify(answer) === JSON.stringify(response);
    }

    return { isCorrect, pointsScored: isCorrect ? question.points : 0 };
  }
}
