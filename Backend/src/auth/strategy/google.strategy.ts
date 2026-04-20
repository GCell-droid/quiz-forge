/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import googleOauthConfig from '../config/google-oauth-config';
import type { ConfigType } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { GoogleRegisterDTO } from '../dto/googleregistration.dto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(googleOauthConfig.KEY)
    private readonly googleConfig: ConfigType<typeof googleOauthConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: googleConfig.clientID!,
      clientSecret: googleConfig.clientSecret!,
      callbackURL: googleConfig.callbackURI!,
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  // Passport automatically extracts the profile, we just need to map it
  async validate(accessToken: string, refreshToken: string, profile: any) {
    // Map the normalized passport profile to the exact fields our database expects
    const oauthUser = {
      name: profile._json.name || profile.displayName,
      email: profile._json.email || profile.emails[0].value,
      oauthId: profile.id,
      oauthProvider: profile.provider,
    };

    // Pass the cleaned payload to the service.
    // Note: We intentionally omit the password field completely.
    return this.authService.validateGoogleUser(
      oauthUser as unknown as GoogleRegisterDTO,
    );
  }
}
