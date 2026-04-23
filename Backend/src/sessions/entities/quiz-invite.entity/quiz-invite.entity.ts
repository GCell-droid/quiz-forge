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

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

@Entity('quiz_invites')
export class QuizInvite {
  @PrimaryGeneratedColumn('uuid')
  inviteId!: string;

  @ManyToOne(() => QuizSession)
  @JoinColumn({ name: 'sessionId' })
  session!: QuizSession;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'invitedBy' })
  invitedBy!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string;

  @Column({ type: 'enum', enum: InviteStatus, default: InviteStatus.PENDING })
  status!: InviteStatus;

  @CreateDateColumn()
  invitedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt!: Date;
}
