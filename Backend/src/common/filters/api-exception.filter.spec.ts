import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ApiExceptionFilter, ApiErrorResponse } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const setHeader = jest.fn();
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'POST', path: '/v1/auth/accounts' }),
      getResponse: () => ({ status, setHeader }),
    }),
  } as unknown as ArgumentsHost;
  const filter = new ApiExceptionFilter();

  beforeEach(() => jest.clearAllMocks());

  it('preserves a safe client error with consistent fields', () => {
    filter.catch(new ConflictException('Account already exists'), host);
    const body = json.mock.calls[0][0] as ApiErrorResponse;
    expect(status).toHaveBeenCalledWith(409);
    expect(body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      message: 'Account already exists',
      path: '/v1/auth/accounts',
    });
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    expect(body.requestId).toBeTruthy();
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', body.requestId);
  });

  it('does not expose validation internals or submitted values', () => {
    filter.catch(
      new BadRequestException(['password must be secret-value']),
      host,
    );
    expect(json.mock.calls[0][0]).toMatchObject({
      statusCode: 400,
      message: 'Please check the submitted fields',
    });
  });

  it('hides unexpected and explicit server error messages', () => {
    filter.catch(new Error('DB_URL=secret'), host);
    expect(json.mock.calls[0][0]).toMatchObject({
      statusCode: 500,
      message: 'An unexpected error occurred',
    });
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('secret');
  });
});
