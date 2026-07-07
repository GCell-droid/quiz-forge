// User roles
export enum UserRole {
  STUDENT = "student",
  TEACHER = "teacher",
  ADMIN = "admin",
}

// Quiz status (for creating/updating quizzes)
export enum QuizStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

// Quiz visibility
export enum QuizVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

// Bundle visibility (same values but different enum for bundles)
export enum BundleVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

// Question types
export enum QuestionType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
  SHORT_ANSWER = "SHORT_ANSWER",
}

// Session status
export enum SessionStatus {
  SCHEDULED = "SCHEDULED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
}

// Session access type
export enum AccessType {
  OPEN = "OPEN",
  CODE_ONLY = "CODE_ONLY",
  INVITE_ONLY = "INVITE_ONLY",
}

// Participant status
export enum ParticipantStatus {
  JOINED = "JOINED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  LEFT = "LEFT",
}

// Invite status
export enum InviteStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

// AI quiz difficulty
export enum QuizDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}
