import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionBundle } from '../quizzes/entities/question-bundle.entity/question-bundle.entity';
import { Quiz } from '../quizzes/entities/quiz.entity/quiz.entity';
import { QuestionResponse } from '../sessions/entities/question-response.entity/question-response.entity';
import { QuizSession } from '../sessions/entities/quiz-session.entity/quiz-session.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './dashboard.repository';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionBundle,
      Quiz,
      QuizSession,
      QuestionResponse,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardRepository, DashboardService],
})
export class DashboardModule {}
