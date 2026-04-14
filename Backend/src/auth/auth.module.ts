import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import googleOauthConfig from './config/google-oauth-config';
import { ConfigModule } from '@nestjs/config';
import { GoogleStrategy } from './strategy/google.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entity/user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy/jwt-strategy';
import { RoleGuard } from './guards/roles-guard/roles.guard';
import { jwtAuthGuard } from './guards/jwtguard/jwt-auth.guard';
import { GoogleOrJwtAuthGuard } from './guards/combinedGuard/combined-auth.guard';

@Module({
  imports: [
    ConfigModule.forFeature(googleOauthConfig),
    TypeOrmModule.forFeature([UserEntity]),
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
    GoogleOrJwtAuthGuard,
  ],
  exports: [AuthService, RoleGuard, jwtAuthGuard, GoogleOrJwtAuthGuard],
})
export class AuthModule {}
