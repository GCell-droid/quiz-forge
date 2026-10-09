export interface GeneratedQuizQuestion {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  source: 'teacher_notes' | 'general_knowledge';
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
  gradeLevel?: string;
  context?: string;
  validChunkCount?: number;
}

export abstract class AiModel {
  abstract generate(request: GenerateQuizRequest): Promise<unknown>;
  abstract summarizeElement(type: 'image' | 'table', content: string): Promise<string>;
}
