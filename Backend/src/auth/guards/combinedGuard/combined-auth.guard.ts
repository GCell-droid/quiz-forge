import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOrJwtAuthGuard extends AuthGuard(['jwt', 'google']) {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First try JWT
    const jwtAuthGuard = new (AuthGuard('jwt'))();
    try {
      const isJwtValid = await jwtAuthGuard.canActivate(context);
      if (isJwtValid) {
        return true;
      }
    } catch {
      // ignore and fall back to Google
    }
    const googleAuthGuard = new (AuthGuard('google'))();
    const isGoogleValid = await googleAuthGuard.canActivate(context);

    return !!isGoogleValid; // force to boolean
  }
}
