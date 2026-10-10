import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionGateway } from './events/session/session.gateway';
import { QuizSession } from './entities/quiz-session.entity/quiz-session.entity';
import { BullModule } from '@nestjs/bullmq';
import { QuizzesModule } from '../quizzes/quizzes.module';
import { QuizLifecycleProcessor } from './processors/quiz-lifecycle.processor';
import { AnswerIngestionProcessor } from './processors/answer-ingestion.processor';
import { Question } from '../quizzes/entities/question.entity/question.entity';

import { AuthModule } from '../auth/auth.module';
import { QuestionResponse } from './entities/question-response.entity/question-response.entity';
import { AnswerSubmissionService } from './answer-submission.service';
import { BullAnswerQueue } from './queue/bull-answer.queue';
import { ANSWER_QUEUE } from './ports/answer-queue.port';
import { SESSION_EVENTS } from './ports/session-events.port';
import { SessionRepository } from './repositories/session.repository';
import { ResponseRepository } from './repositories/response.repository';
import { UserPersistenceModule } from '../common/repositories/user-persistence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuizSession, Question, QuestionResponse]),
    BullModule.registerQueue(
      { name: 'quiz-lifecycle' },
      { name: 'answer-ingestion' },
    ),
    QuizzesModule,
    AuthModule,
    UserPersistenceModule,
  ],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    SessionRepository,
    ResponseRepository,
    AnswerSubmissionService,
    SessionGateway,
    BullAnswerQueue,
    { provide: ANSWER_QUEUE, useExisting: BullAnswerQueue },
    { provide: SESSION_EVENTS, useExisting: SessionGateway },
    QuizLifecycleProcessor,
    AnswerIngestionProcessor,
  ],
  exports: [SessionsService, SessionGateway],
})
export class SessionsModule {}
