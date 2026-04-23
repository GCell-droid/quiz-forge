import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Quiz } from '../quiz.entity/quiz.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  questionId!: string;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz!: Quiz;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'enum', enum: QuestionType })
  type!: QuestionType;

  @Column({ type: 'jsonb' })
  options!: any;

  @Column({ type: 'jsonb' })
  correctAnswer!: any;

  @Column({ type: 'int', default: 1 })
  points!: number;

  @Column({ type: 'int' })
  displayOrder!: number;
}
