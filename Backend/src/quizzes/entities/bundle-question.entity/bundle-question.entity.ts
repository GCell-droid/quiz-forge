import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { QuestionBundle } from '../question-bundle.entity/question-bundle.entity';
import { Question } from '../question.entity/question.entity';

@Entity('bundle_questions')
export class BundleQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => QuestionBundle, (bundle) => bundle.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bundleId' })
  bundle!: QuestionBundle;

  @ManyToOne(() => Question, (question) => question.bundleQuestions, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'questionId' })
  question!: Question;

  @Column({ type: 'int' })
  displayOrder!: number;
}
