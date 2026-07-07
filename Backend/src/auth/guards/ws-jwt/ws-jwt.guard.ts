import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as cookieParser from 'cookie-parser';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    
    try {
      const cookieHeader = client.handshake.headers.cookie;
      if (!cookieHeader) {
        return false;
      }

      // Parse basic cookies
      const cookies = cookieHeader.split(';').reduce((res: Record<string, string>, item) => {
        const data = item.trim().split('=');
        return { ...res, [data[0]]: data[1] };
      }, {});

      const rawJwt = cookies['jwt'];
      if (!rawJwt) {
        return false;
      }

      const cookieSecret = this.configService.get<string>('COOKIE_SECRET');
      const token = cookieParser.signedCookie(decodeURIComponent(rawJwt), cookieSecret!);
      
      if (!token) {
        return false;
      }

      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret: jwtSecret });

      // Attach user object to socket client
      (client as any).user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch (err: any) {
      this.logger.error('WebSocket JWT Verification failed: ' + err.message);
      return false;
    }
  }
}
