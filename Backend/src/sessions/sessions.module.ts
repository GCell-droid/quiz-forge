import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionGateway } from './events/session/session.gateway';
import { QuizSession } from './entities/quiz-session.entity/quiz-session.entity';
import { QuizParticipant } from './entities/quiz-participant.entity/quiz-participant.entity';
import { QuizInvite } from './entities/quiz-invite.entity/quiz-invite.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuizSession, QuizParticipant, QuizInvite]),
  ],
  controllers: [SessionsController],
  providers: [SessionsService, SessionGateway],
})
export class SessionsModule {}
