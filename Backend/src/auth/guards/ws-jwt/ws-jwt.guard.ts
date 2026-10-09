import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as cookieParser from 'cookie-parser';
import { Socket } from 'socket.io';
import { MetricsService } from '../../../metrics/metrics.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ws = context.switchToWs();
    const client: Socket = ws.getClient<Socket>();
    const pattern = ws.getPattern?.() || 'auth';

    // Fast-path: client already authenticated via HTTP connection handshake
    if (client.data.user?.userId) {
      return true;
    }

    return this.authenticateClient(client, pattern);
  }

  public authenticateClient(client: Socket, pattern: string = 'auth'): boolean {
    if (client.data.user?.userId) {
      return true;
    }

    try {
      const cookieHeader = client.handshake.headers?.cookie;
      if (!cookieHeader) {
        this.metrics?.websocketErrorsTotal
          .labels(pattern, 'unauthorized')
          .inc();
        return false;
      }

      // Parse basic cookies
      const cookies = cookieHeader
        .split(';')
        .reduce((res: Record<string, string>, item) => {
          const data = item.trim().split('=');
          return { ...res, [data[0]]: data[1] };
        }, {});

      const rawJwt = cookies['jwt'];
      if (!rawJwt) {
        this.metrics?.websocketErrorsTotal
          .labels(pattern, 'unauthorized')
          .inc();
        return false;
      }

      const cookieSecret = this.configService.get<string>('COOKIE_SECRET');
      const token = cookieParser.signedCookie(
        decodeURIComponent(rawJwt),
        cookieSecret!,
      );

      if (!token) {
        this.metrics?.websocketErrorsTotal
          .labels(pattern, 'unauthorized')
          .inc();
        return false;
      }

      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret: jwtSecret });

      // Attach user object to socket client so all subsequent guarded events take the instant fast-path
      client.data.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      };

      return true;
    } catch (err: any) {
      this.logger.error('WebSocket JWT Verification failed: ' + err.message);
      this.metrics?.websocketErrorsTotal.labels(pattern, 'unauthorized').inc();
      return false;
    }
  }
}
