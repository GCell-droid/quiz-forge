import { Entity, PrimaryGeneratedColumn, Column, OneToMany, DeleteDateColumn } from 'typeorm';
import { QuizQuestion } from '../quiz-question.entity/quiz-question.entity';
import { BundleQuestion } from '../bundle-question.entity/bundle-question.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  questionId!: string;

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

  @OneToMany(() => QuizQuestion, (qq) => qq.question)
  quizQuestions!: QuizQuestion[];

  @OneToMany(() => BundleQuestion, (bq) => bq.question)
  bundleQuestions!: BundleQuestion[];

  @DeleteDateColumn()
  deletedAt!: Date;
}
