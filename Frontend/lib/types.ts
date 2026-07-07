import {
  UserRole,
  QuizStatus,
  QuizVisibility,
  BundleVisibility,
  QuestionType,
  SessionStatus,
  AccessType,
  ParticipantStatus,
  QuizDifficulty,
} from "./enums";

// ─── USER ────────────────────────────────────────────────────

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  oauthProvider: string | null;
  oauthId: string | null;
  isActive: boolean;
  createdAt: string; // ISO date string
}

// ─── QUESTION ────────────────────────────────────────────────

export interface Question {
  questionId: string;
  title: string;
  type: QuestionType;
  options: string[] | null; // JSON — for MCQ: string[], for TRUE_FALSE: ["True","False"]
  correctAnswer: string | null; // JSON — varies by type
  points: number;
}

// ─── BUNDLE ──────────────────────────────────────────────────

export interface BundleQuestion {
  id: string; // bridge ID
  question: Question;
  displayOrder: number;
}

export interface QuestionBundle {
  bundleId: string;
  title: string;
  description: string | null;
  visibility: BundleVisibility;
  tags: string[];
  createdBy: {
    uid: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  questions: BundleQuestion[];
}

// ─── QUIZ ────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string; // bridge ID
  question: Question;
  displayOrder: number;
}

export interface Quiz {
  quizId: string;
  title: string;
  description: string | null;
  status: QuizStatus;
  visibility: QuizVisibility;
  tags: string[];
  createdBy: {
    uid: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  quizQuestions: QuizQuestion[];
}

// ─── SESSION ─────────────────────────────────────────────────

export interface QuizSession {
  sessionId: string;
  quiz: Quiz;
  createdBy: User;
  joinCode: string;
  accessType: AccessType;
  status: SessionStatus;
  scheduledStart: string;
  actualStart: string | null;
  endTime: string | null;
  timeLimit: number; // in seconds
  createdAt: string;
}

// ─── AI GENERATED QUIZ ──────────────────────────────────────

export interface AiQuizQuestion {
  title: string;
  options: string[];
  correctAnswer: string;
  points: number;
  type: string; // always "MULTIPLE_CHOICE"
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  questions: AiQuizQuestion[];
}

// ─── WEBSOCKET PAYLOADS ─────────────────────────────────────

// Client emits "joinSession" with:
export interface JoinSessionPayload {
  sessionId: string;
}

// Client emits "submitAnswer" with:
export interface SubmitAnswerPayload {
  sessionId: string;
  questionId: string;
  userId: string;
  response: string;
  timeTakenSecs: number;
}

// Server emits "quiz_started" with:
export interface QuizStartedPayload {
  sessionId: string;
  quizTitle: string;
  questions: {
    questionId: string;
    title: string;
    type: QuestionType;
    options: string[] | null;
    points: number;
  }[];
  timeLimit: number;
}

// Server emits "live_answer_submitted" to teacher room with:
export interface LiveAnswerPayload {
  questionId: string;
  userId: string;
  userName: string;
  response: string;
  timeTakenSecs: number;
  isCorrect: boolean;
  pointsScored: number;
}

// Server emits "initial_stats" to teacher room with:
export interface InitialStatsPayload {
  stats: LiveAnswerPayload[];
}

// ─── CREATE DTOs ─────────────────────────────────────────────

export interface CreateQuestionDto {
  title: string;
  type: QuestionType;
  options: string[] | null;
  correctAnswer: string | null;
  points: number;
  displayOrder: number;
}

export interface CreateBundleDto {
  title: string;
  description?: string;
  visibility?: BundleVisibility;
  tags: string[];
  questions?: CreateQuestionDto[];
}

export interface CreateQuizDto {
  title: string;
  description?: string;
  status?: QuizStatus;
  visibility?: QuizVisibility;
  tags?: string[];
  bundleId?: string;
  questions?: CreateQuestionDto[];
}

export interface ScheduleSessionDto {
  quizId: string;
  scheduledStart: string;
  timeLimit: number;
}

export interface GenerateQuizDto {
  topic: string;
  numQuestions?: number;
  difficulty?: QuizDifficulty;
}
