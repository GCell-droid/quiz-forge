import User from 'src/common/entity/user.entity';
import { Quiz } from 'src/quizzes/entities/quiz.entity/quiz.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum AccessType {
  OPEN = 'OPEN',
  CODE_ONLY = 'CODE_ONLY',
  INVITE_ONLY = 'INVITE_ONLY',
}

export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

@Entity('quiz_sessions')
export class QuizSession {
  @PrimaryGeneratedColumn('uuid')
  sessionId!: string;

  @ManyToOne(() => Quiz)
  @JoinColumn({ name: 'quizId' })
  quiz!: Quiz;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdBy!: User;

  @Column({ type: 'varchar', length: 10, unique: true })
  joinCode!: string;

  @Column({ type: 'enum', enum: AccessType, default: AccessType.CODE_ONLY })
  accessType!: AccessType;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
  })
  status!: SessionStatus;

  @Column({ type: 'timestamp' })
  scheduledStart!: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStart!: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime!: Date;

  @Column({ type: 'int' })
  timeLimit!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
