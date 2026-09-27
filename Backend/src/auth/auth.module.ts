import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import googleOauthConfig from './config/google-oauth-config';
import { ConfigModule } from '@nestjs/config';
import { GoogleStrategy } from './strategy/google.strategy';
import { UserPersistenceModule } from '../common/repositories/user-persistence.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy/jwt-strategy';
import { RoleGuard } from './guards/roles-guard/roles.guard';
import { jwtAuthGuard } from './guards/jwtguard/jwt-auth.guard';

import { WsJwtGuard } from './guards/ws-jwt/ws-jwt.guard';

@Module({
  imports: [
    ConfigModule.forFeature(googleOauthConfig),
    UserPersistenceModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    RoleGuard,
    jwtAuthGuard,
    WsJwtGuard,
  ],
  exports: [AuthService, RoleGuard, jwtAuthGuard, JwtModule, WsJwtGuard],
})
export class AuthModule {}
