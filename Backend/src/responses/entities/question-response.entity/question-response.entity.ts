import User from 'src/common/entity/user.entity';
import { Question } from 'src/quizzes/entities/question.entity/question.entity';
import { QuizSession } from 'src/sessions/entities/quiz-session.entity/quiz-session.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('question_responses')
export class QuestionResponse {
  @PrimaryGeneratedColumn('uuid')
  responseId!: string;

  @ManyToOne(() => QuizSession)
  @JoinColumn({ name: 'sessionId' })
  session!: QuizSession;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'questionId' })
  question!: Question;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'text' })
  response!: string;

  @Column({ type: 'boolean' })
  isCorrect!: boolean;

  @Column({ type: 'int' })
  pointsScored!: number;

  @CreateDateColumn()
  submittedAt!: Date;

  @Column({ type: 'int' })
  timeTakenSecs!: number;
}
