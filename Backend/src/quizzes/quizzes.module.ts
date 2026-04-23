import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { Quiz } from './entities/quiz.entity/quiz.entity';
import { Question } from './entities/question.entity/question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, Question])],
  controllers: [QuizzesController],
  providers: [QuizzesService],
})
export class QuizzesModule {}
