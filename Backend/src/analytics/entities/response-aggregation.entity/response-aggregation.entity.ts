import { Question } from 'src/quizzes/entities/question.entity/question.entity';
import { QuizSession } from 'src/sessions/entities/quiz-session.entity/quiz-session.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('response_aggregations')
export class ResponseAggregation {
  @PrimaryGeneratedColumn('uuid')
  aggregateId!: string;

  @ManyToOne(() => QuizSession)
  @JoinColumn({ name: 'sessionId' })
  session!: QuizSession;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'questionId' })
  question!: Question;

  @Column({ type: 'varchar', length: 100 })
  selectedOption!: string;

  @Column({ type: 'int', default: 0 })
  responseCount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentage!: number;

  @Column({ type: 'boolean' })
  isCorrectOption!: boolean;

  @UpdateDateColumn({ type: 'timestamp', precision: 3 })
  lastUpdated!: Date;
}
