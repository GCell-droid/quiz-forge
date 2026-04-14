// quiz.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { QuizGateway } from './quiz.gateway';
import { QuizEntity } from './entites/quiz.entity';
import { QuestionEntity } from './entites/question.entity';
import { OptionEntity } from './entites/option.entity';
import { ResponseEntity } from './entites/response.entity';
import { ResultEntity } from './entites/result.entity';
import { UserEntity } from '../auth/entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuizEntity,
      QuestionEntity,
      OptionEntity,
      ResponseEntity,
      ResultEntity,
      UserEntity,
    ]),
  ],
  controllers: [QuizController],
  providers: [QuizService, QuizGateway],
  exports: [QuizService],
})
export class QuizModule {}
