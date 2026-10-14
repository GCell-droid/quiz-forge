export const SESSION_EVENTS = Symbol('SESSION_EVENTS');

export interface QuizStartedEvent {
  sessionId: string;
  quizTitle: string;
  questions: {
    questionId: string;
    title: string;
    type: string;
    options: unknown;
    points: number;
  }[];
  totalQuestions: number;
  timeLimit: number;
}

export interface AnswerSubmittedEvent {
  questionId: string;
  userId: string;
  userName: string;
  response: string;
  timeTakenSecs: number;
  isCorrect: boolean;
  pointsScored: number;
}

export interface SessionEvents {
  quizStarted(event: QuizStartedEvent): void;
  answerSubmitted(sessionId: string, event: AnswerSubmittedEvent): void;
  sessionEnded(sessionId: string): void;
  disconnectSession(sessionId: string): void;
}
