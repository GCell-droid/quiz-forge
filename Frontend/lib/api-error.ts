import { isAxiosError } from "axios";

export interface ApiErrorResponse {
  timestamp: string;
  statusCode: number;
  error: string;
  message: string;
  path: string;
  requestId: string;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.timestamp === "string" &&
    typeof body.statusCode === "number" &&
    typeof body.error === "string" &&
    typeof body.message === "string" &&
    typeof body.path === "string" &&
    typeof body.requestId === "string"
  );
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) return fallback;
  const body: unknown = error.response?.data;
  if (
    !isApiErrorResponse(body) ||
    body.statusCode !== error.response?.status ||
    !body.message.trim()
  ) {
    return fallback;
  }
  return body.message;
}

export function getSocketErrorMessage(response: unknown, fallback: string): string {
  if (typeof response !== "object" || response === null) return fallback;
  const result = response as Record<string, unknown>;
  if (result.success !== false || !isApiErrorResponse(response)) return fallback;
  return response.message.trim() || fallback;
}
