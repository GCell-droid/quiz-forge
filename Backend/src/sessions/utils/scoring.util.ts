export interface ScoredQuestion {
  questionId: string;
  points: number;
  correctAnswer: string | number | boolean | any;
}

export function scoreAnswer(
  question: ScoredQuestion,
  response: string,
): { isCorrect: boolean; pointsScored: number } {
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
