import { ExecutionContext } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let jwtService: { verify: jest.Mock };
  let configService: { get: jest.Mock };
  let metricsService: { websocketErrorsTotal: { labels: jest.Mock } };

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'COOKIE_SECRET') return 'test-cookie-secret';
        if (key === 'JWT_SECRET') return 'test-jwt-secret';
        return null;
      }),
    };
    metricsService = {
      websocketErrorsTotal: {
        labels: jest.fn().mockReturnValue({ inc: jest.fn() }),
      },
    };
    guard = new WsJwtGuard(
      jwtService as never,
      configService as never,
      metricsService as never,
    );
  });

  function createMockContext(client: any): ExecutionContext {
    return {
      switchToWs: () => ({
        getClient: () => client,
        getPattern: () => 'submitAnswer',
      }),
    } as unknown as ExecutionContext;
  }

  it('takes the fast path and returns true immediately if client.user is already attached', async () => {
    const client = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'student',
        name: 'Test Student',
      },
      handshake: { headers: {} },
    };

    const result = await guard.canActivate(createMockContext(client));

    expect(result).toBe(true);
    expect(jwtService.verify).not.toHaveBeenCalled();
    expect(configService.get).not.toHaveBeenCalled();
  });

  it('rejects connection if cookie header is missing when client.user is not set', async () => {
    const client = {
      handshake: { headers: {} },
    };

    const result = await guard.canActivate(createMockContext(client));

    expect(result).toBe(false);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });

  it('rejects connection if jwt cookie is not present in cookie header', async () => {
    const client = {
      handshake: {
        headers: {
          cookie: 'other_cookie=value; theme=dark',
        },
      },
    };

    const result = await guard.canActivate(createMockContext(client));

    expect(result).toBe(false);
    expect(jwtService.verify).not.toHaveBeenCalled();
  });
});
