import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from 'src/auth/entity/user.entity';
import { QuestionEntity } from './question.entity';

@Entity('quiz')
export class QuizEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isAIgenerated: boolean;

  @ManyToOne(() => UserEntity, (user) => user.quizzes, { onDelete: 'CASCADE' })
  author: UserEntity;

  @OneToMany(() => QuestionEntity, (q) => q.quiz, { cascade: true })
  questions: QuestionEntity[];

  @Column({ default: false })
  isActive: boolean;

  @Column({ nullable: true })
  timerSeconds: number;

  @CreateDateColumn()
  createdAt: Date;
}
