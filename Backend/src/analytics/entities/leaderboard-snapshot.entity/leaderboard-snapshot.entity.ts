import User from 'src/common/entity/user.entity';
import { QuizSession } from 'src/sessions/entities/quiz-session.entity/quiz-session.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('leaderboard_snapshots')
export class LeaderboardSnapshot {
  @PrimaryGeneratedColumn('uuid')
  snapshotId!: string;

  @ManyToOne(() => QuizSession)
  @JoinColumn({ name: 'sessionId' })
  session!: QuizSession;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'int', default: 0 })
  currentScore!: number;

  @Column({ type: 'int', default: 0 })
  questionsAnswered!: number;

  @Column({ type: 'int', nullable: true })
  ranking!: number;

  @Column({ type: 'varchar', length: 100 })
  studentName!: string;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  lastUpdated!: Date;
}
