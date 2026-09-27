// users.module.ts
import { Module } from '@nestjs/common';
import { UserPersistenceModule } from '../common/repositories/user-persistence.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [UserPersistenceModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
