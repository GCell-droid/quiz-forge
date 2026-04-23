import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { QuizSession } from '../quiz-session.entity/quiz-session.entity';
import User from 'src/common/entity/user.entity';
import { QuizInvite } from '../quiz-invite.entity/quiz-invite.entity';

export enum ParticipantStatus {
  JOINED = 'JOINED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  LEFT = 'LEFT',
}

@Entity('quiz_participants')
export class QuizParticipant {
  @PrimaryGeneratedColumn('uuid')
  participantId!: string;

  @ManyToOne(() => QuizSession)
  @JoinColumn({ name: 'sessionId' })
  session!: QuizSession;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => QuizInvite, { nullable: true })
  @JoinColumn({ name: 'inviteId' })
  invite!: QuizInvite;

  @CreateDateColumn()
  joinedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt!: Date;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.JOINED,
  })
  status!: ParticipantStatus;

  @Column({ type: 'int', nullable: true })
  finalScore!: number;

  @Column({ type: 'int', nullable: true })
  ranking!: number;
}
