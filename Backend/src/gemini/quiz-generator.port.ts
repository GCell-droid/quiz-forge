export const QUIZ_GENERATOR = Symbol('QUIZ_GENERATOR');

export interface GeneratedQuizQuestion {
  title: string;
  options: string[];
  correctAnswer: string;
  points: number;
  type: string;
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  questions: GeneratedQuizQuestion[];
}

export interface GenerateQuizRequest {
  topic: string;
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizGenerator {
  generate(request: GenerateQuizRequest): Promise<GeneratedQuiz>;
}
