// src/auth/guards/ws-jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    // support both HTTP and WS contexts
    const ctxType = context.getType();
    if (ctxType === 'ws') {
      const client: Socket = context.switchToWs().getClient<Socket>();

      // token can be passed in handshake.auth.token or handshake.headers.authorization
      const authHeader =
        client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('Missing auth token');
      }
      const token = (authHeader as string).startsWith('Bearer ')
        ? (authHeader as string).slice(7)
        : (authHeader as string);

      // Put token where your JwtStrategy expects it (signedCookies.jwt)
      // Your JwtStrategy extracts from req.signedCookies.jwt
      (client as any).signedCookies = { jwt: token };

      // return the client as the "request" object for Passport to use
      return client as any;
    }

    // fallback for HTTP
    return context.switchToHttp().getRequest();
  }
}
