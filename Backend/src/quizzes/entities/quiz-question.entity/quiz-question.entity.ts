import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Quiz } from '../quiz.entity/quiz.entity';
import { Question } from '../question.entity/question.entity';

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Quiz, (quiz) => quiz.quizQuestions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz!: Quiz;

  @ManyToOne(() => Question, (question) => question.quizQuestions, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'questionId' })
  question!: Question;

  @Column({ type: 'int' })
  displayOrder!: number;
}
