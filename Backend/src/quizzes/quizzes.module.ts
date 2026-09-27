import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { BundlesController } from './bundles.controller';
import { Quiz } from './entities/quiz.entity/quiz.entity';
import { Question } from './entities/question.entity/question.entity';
import { QuestionBundle } from './entities/question-bundle.entity/question-bundle.entity';
import { BundleQuestion } from './entities/bundle-question.entity/bundle-question.entity';
import { QuizQuestion } from './entities/quiz-question.entity/quiz-question.entity';
import { BundlesService } from './bundles.service';
import { QuizRepository } from './repositories/quiz.repository';
import { BundleRepository } from './repositories/bundle.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quiz,
      Question,
      QuizQuestion,
      QuestionBundle,
      BundleQuestion,
    ]),
  ],
  controllers: [QuizzesController, BundlesController],
  providers: [QuizzesService, BundlesService, QuizRepository, BundleRepository],
  exports: [QuizzesService, BundlesService],
})
export class QuizzesModule {}
