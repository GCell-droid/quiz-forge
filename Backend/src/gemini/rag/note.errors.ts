import {
  ConflictException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';

export const TEACHER_QUOTA_BYTES = 200 * 1024 * 1024;
export const MAX_NOTE_BYTES = 25 * 1024 * 1024;

export class QuotaExceededError extends HttpException {
  constructor(
    public readonly usedBytes: number,
    public readonly newFileBytes: number,
  ) {
    super(
      'Your 200 MB storage is full. Delete a note before uploading another.',
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
    this.name = 'QuotaExceededError';
  }
}

export class NoteOperationError extends ConflictException {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'NoteOperationError';
  }
}

export function requireTeacherId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) {
    throw new UnauthorizedException(
      'Please sign in with your teacher account.',
    );
  }
  return value;
}
