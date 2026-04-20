export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}
export enum QuizStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}
export enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
}
export enum AccessType {
  OPEN = 'open',
  CODE_ONLY = 'code_only',
  INVITE_ONLY = 'invite_only',
}
export enum SessionStatus {
  SCHEDULED = 'scheduled',
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}
export enum InviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}
export enum ParticipantStatus {
  JOINED = 'joined',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
}
