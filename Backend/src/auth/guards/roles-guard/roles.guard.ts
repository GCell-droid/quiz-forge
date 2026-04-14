/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-unsafe-optional-chaining */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../entity/user.entity';
import { ROLES_KEY } from '../../decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  //reflector will help us to read metadata
  constructor(private reflector: Reflector) {}
  //canActivate :decides whether to proceed to next route handler or not //true //false
  // it is like next() in express
  canActivate(context: ExecutionContext): boolean {
    //reflector.getAllAndOverride() checks:
    // First → Does the route handler (method) have @Roles() decorator metadata?
    // If yes → use that.
    // Else → Does the controller class itself have @Roles() metadata?
    // If yes → use that.
    // Else → returns undefined.
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [
        context.getHandler(), //method level metadata
        context.getClass(), //class level metadata
      ],
    );
    // there are some routes that does not require any roles like login, register so in that case this will return true
    if (!requiredRoles) return true; //means there is no context
    const { user } = context?.switchToHttp()?.getRequest(); //user object is attached to request in jwt authguard
    if (!user) throw new ForbiddenException('User Not Authenticated');
    const hasRequiredRolesOrNot = requiredRoles.some(
      (role) => role === user.role,
    );
    if (!hasRequiredRolesOrNot) {
      throw new ForbiddenException('Insufficient Permission');
    }
    return true;
  }
}
