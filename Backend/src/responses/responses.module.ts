import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';
import { QuestionResponse } from './entities/question-response.entity/question-response.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionResponse])],
  controllers: [ResponsesController],
  providers: [ResponsesService],
})
export class ResponsesModule {}
