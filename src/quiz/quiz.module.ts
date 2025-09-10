import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { UserEntity } from 'src/auth/entity/user.entity';
import { QuizEntity } from './entites/quiz.entity';
import { QuestionEntity } from './entites/question.entity';
import { AnswerEntity } from './entites/answer.entity';
import { QuizSessionEntity } from './entites/quizsession.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuizEntity,
      QuestionEntity,
      AnswerEntity,
      QuizSessionEntity,
      UserEntity,
    ]),
  ],
  providers: [QuizService],
  controllers: [QuizController],
})
export class QuizModule {}
