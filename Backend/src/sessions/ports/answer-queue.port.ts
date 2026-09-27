export const ANSWER_QUEUE = Symbol('ANSWER_QUEUE');

export interface AnswerJob {
  sessionId: string;
  questionId: string;
  userId: string;
  response: string;
  timeTakenSecs: number;
}

export interface AnswerQueue {
  enqueue(answer: AnswerJob): Promise<void>;
}
