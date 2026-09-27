import { randomUUID } from 'node:crypto';
import { STATUS_CODES } from 'node:http';

export interface ApiErrorResponse {
  timestamp: string;
  statusCode: number;
  error: string;
  message: string;
  path: string;
  requestId: string;
}

export function createApiError(
  statusCode: number,
  message: string,
  path: string,
): ApiErrorResponse {
  return {
    timestamp: new Date().toISOString(),
    statusCode,
    error: STATUS_CODES[statusCode] ?? 'Error',
    message,
    path,
    requestId: randomUUID(),
  };
}
