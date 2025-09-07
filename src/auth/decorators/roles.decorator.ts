import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entity/user.entity';
//unique identifier for storing and retrieving role requirements as metadata on route handler
export const ROLES_KEY = 'roles';
//role decorator marks the routes with roles that are allowed to access them
//roles guard will later reads the metadata to check if user has permission for that route
// SetMetadata is a NestJS helper for making class or method decorators.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
// This decorator doesn’t inject a value into a parameter. Instead, it attaches metadata (here: roles) to a route or controller.
// Later, a guard can read this metadata with Reflector.
