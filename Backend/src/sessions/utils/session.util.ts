import { SessionStatus } from '../entities/quiz-session.entity/quiz-session.entity';

/**
 * Generates a random 6-character alphanumeric join code.
 */
export function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Calculates the remaining time for a session and whether it has expired.
 */
export function getRemainingTimeSecs(sessionDetails: {
  status: SessionStatus;
  scheduledStart?: Date | string;
  actualStart?: Date | string;
  timeLimit: number;
}): { isExpired: boolean; remainingTimeSecs: number } {
  if (sessionDetails.status === SessionStatus.COMPLETED) {
    return { isExpired: true, remainingTimeSecs: 0 };
  }

  const start = sessionDetails.actualStart || sessionDetails.scheduledStart;
  if (!start) {
    return {
      isExpired: false,
      remainingTimeSecs: sessionDetails.timeLimit || 0,
    };
  }

  const startDate = typeof start === 'string' ? new Date(start) : start;
  const elapsedSecs = Math.floor((Date.now() - startDate.getTime()) / 1000);
  const remainingTime = Math.max(
    0,
    (sessionDetails.timeLimit || 0) - elapsedSecs,
  );

  return {
    isExpired: remainingTime <= 0,
    remainingTimeSecs: remainingTime,
  };
}

/**
 * Convenience method to check if a session is expired based on its time limit.
 */
export function isSessionExpired(sessionDetails: {
  status: SessionStatus;
  scheduledStart?: Date | string;
  actualStart?: Date | string;
  timeLimit: number;
}): boolean {
  return getRemainingTimeSecs(sessionDetails).isExpired;
}
