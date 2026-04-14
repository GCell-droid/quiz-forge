import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entity/user.entity';
import { QuizEntity } from './quiz.entity';

@Entity('result')
export class ResultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.results, { onDelete: 'CASCADE' })
  user: UserEntity;

  @ManyToOne((): typeof QuizEntity => QuizEntity, (quiz) => quiz.results, {
    onDelete: 'CASCADE',
  })
  quiz: QuizEntity;

  @Column({ type: 'float', default: 0 })
  score: number;

  @CreateDateColumn()
  submittedAt: Date;
}
