import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import type { Request, Response } from 'express';
import { createApiError } from '../api-error';
export type { ApiErrorResponse } from '../api-error';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    const body = createApiError(
      statusCode,
      this.safeMessage(exception, statusCode),
      request.path,
    );

    if (statusCode >= 500) {
      const name = exception instanceof Error ? exception.name : 'UnknownError';
      const message =
        exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${body.requestId}: ${name} on ${request.method} ${request.path} - ${message}`,
        stack,
      );
    }

    response.setHeader('X-Request-Id', body.requestId);
    response.status(statusCode).json(body);
  }

  private safeMessage(exception: unknown, statusCode: number): string {
    if (statusCode >= 500) {
      return statusCode === HttpStatus.SERVICE_UNAVAILABLE ||
        statusCode === HttpStatus.BAD_GATEWAY ||
        statusCode === HttpStatus.GATEWAY_TIMEOUT
        ? 'Service temporarily unavailable'
        : 'An unexpected error occurred';
    }

    if (!(exception instanceof HttpException)) return 'Request failed';
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const message = response.message;
      if (typeof message === 'string') return message;
    }
    return statusCode === HttpStatus.BAD_REQUEST
      ? 'Please check the submitted fields'
      : (STATUS_CODES[statusCode] ?? 'Request failed');
  }
}
