// src/quiz/quiz.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { UserEntity } from 'src/auth/entity/user.entity';
import { QuizEntity } from './entites/quiz.entity';
import { QuestionEntity } from './entites/question.entity';
import { OptionEntity } from './entites/option.entity';
import { ResponseEntity } from './entites/response.entity';
import { ResultEntity } from './entites/result.entity';

// import { QuizGateway } from './gateway/quiz.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuizEntity,
      QuestionEntity,
      ResponseEntity,
      OptionEntity,
      UserEntity,
      ResultEntity,
    ]),
  ],
  providers: [QuizService],
  controllers: [QuizController],
  exports: [QuizService], // export if used outside
})
export class QuizModule {}
