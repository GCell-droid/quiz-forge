import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionGateway } from './events/session/session.gateway';
import { QuizSession } from './entities/quiz-session.entity/quiz-session.entity';
import { QuizParticipant } from './entities/quiz-participant.entity/quiz-participant.entity';
import { QuizInvite } from './entities/quiz-invite.entity/quiz-invite.entity';
import { BullModule } from '@nestjs/bullmq';
import { QuizzesModule } from '../quizzes/quizzes.module';
import { QuizLifecycleProcessor } from './processors/quiz-lifecycle.processor';
import { AnswerIngestionProcessor } from './processors/answer-ingestion.processor';
import { Question } from '../quizzes/entities/question.entity/question.entity';
import User from '../common/entity/user.entity';

import { AuthModule } from '../auth/auth.module';
import { QuestionResponse } from './entities/question-response.entity/question-response.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuizSession,
      QuizParticipant,
      QuizInvite,
      Question,
      QuestionResponse,
      User,
    ]),
    BullModule.registerQueue(
      { name: 'quiz-lifecycle' },
      { name: 'answer-ingestion' },
    ),
    QuizzesModule,
    AuthModule,
  ],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    SessionGateway,
    QuizLifecycleProcessor,
    AnswerIngestionProcessor,
  ],
  exports: [SessionsService, SessionGateway],
})
export class SessionsModule {}
