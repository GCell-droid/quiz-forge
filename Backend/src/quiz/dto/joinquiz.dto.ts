// src/quiz/dto/join-quiz.dto.ts
export class JoinQuizDto {
  quizId: number;
  userId: number; // in prod: derive from JWT on socket handshake
  role?: 'student' | 'teacher';
}

// src/quiz/dto/submit-answer.dto.ts
export class SubmitAnswerDto {
  quizId: number;
  questionId: number;
  selectedAnswer: string | null; // null if skipping
  userId: number; // in prod: derive from JWT
}
