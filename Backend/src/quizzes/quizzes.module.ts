import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { Quiz } from './entities/quiz.entity/quiz.entity';
import { Question } from './entities/question.entity/question.entity';
import { QuestionBundle } from './entities/question-bundle.entity/question-bundle.entity';
import { BundleQuestion } from './entities/bundle-question.entity/bundle-question.entity';
import { QuizQuestion } from './entities/quiz-question.entity/quiz-question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, Question, QuestionBundle, BundleQuestion, QuizQuestion])],
  providers: [QuizzesService],
  controllers: [QuizzesController],
  exports: [QuizzesService],
})
export class QuizzesModule {}
