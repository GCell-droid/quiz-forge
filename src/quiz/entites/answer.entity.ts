import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from 'src/auth/entity/user.entity';
import { QuestionEntity } from './question.entity';
import { QuizSessionEntity } from './quizsession.entity';

@Entity('answer')
export class AnswerEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.answers, { onDelete: 'CASCADE' })
  student: UserEntity;

  @ManyToOne(() => QuestionEntity, (q) => q.answers, { onDelete: 'CASCADE' })
  question: QuestionEntity;

  @ManyToOne(() => QuizSessionEntity, (s) => s.answers, { onDelete: 'CASCADE' })
  session: QuizSessionEntity;

  @Column()
  selectedOptionIndex: number;

  @Column({ default: 0 })
  score: number;

  @CreateDateColumn()
  createdAt: Date;
}
