import { Module } from '@nestjs/common';
import { StudentSideService } from './student-side.service';
import { StudentSideController } from './student-side.controller';

@Module({
  providers: [StudentSideService],
  controllers: [StudentSideController]
})
export class StudentSideModule {}
