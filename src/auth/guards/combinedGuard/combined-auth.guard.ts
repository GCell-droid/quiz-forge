import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtOrGoogleAuthGuard extends AuthGuard(['jwt', 'google']) {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
