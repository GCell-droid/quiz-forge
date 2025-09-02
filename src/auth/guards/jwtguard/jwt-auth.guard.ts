import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
//protects route which need authentication ->protected routes
@Injectable()
export class jwtAuthGuard extends AuthGuard('jwt') {}
