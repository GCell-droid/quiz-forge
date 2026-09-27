import type { GenerateQuizRequest } from './quiz-generator.port';

export const QUIZ_MODEL = Symbol('QUIZ_MODEL');

export interface QuizModel {
  generate(request: GenerateQuizRequest): Promise<unknown>;
}
