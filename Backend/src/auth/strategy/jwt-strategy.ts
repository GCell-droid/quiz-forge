import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// LOGICAL CHANGE: Added an interface to replace 'any' for strict type safety
export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.signedCookies?.jwt;
        },
        // LOGICAL CHANGE: Fallback to standard Bearer token header if cookie is missing (great for Postman/Mobile testing)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || '',
    });
  }

  // LOGICAL CHANGE: Typed the payload instead of using 'any'
  async validate(payload: JwtPayload) {
    // LOGICAL CHANGE: Removed payload.role check here. If a token was minted without a role
    // but the user has one in the DB, we shouldn't automatically fail the token validation.
    if (!payload || !payload?.sub) {
      throw new UnauthorizedException('Invalid Token Payload');
    }

    const user = await this.authService.getUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      ...user,
      role: user.role,
    };
  }
}
