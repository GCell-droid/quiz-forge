import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entity/user.entity';
import { QuizEntity } from './quiz.entity';
import { QuestionEntity } from './question.entity';
import { OptionEntity } from './option.entity';

@Entity('response')
export class ResponseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, (user) => user.responses, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @ManyToOne(() => QuizEntity, (quiz) => quiz.responses, {
    onDelete: 'CASCADE',
  })
  quiz: QuizEntity;

  @ManyToOne(() => QuestionEntity, (question) => question.responses, {
    onDelete: 'CASCADE',
  })
  question: QuestionEntity;

  @ManyToOne(() => OptionEntity, { nullable: true })
  selectedOption: OptionEntity;

  @Column({ default: false })
  isCorrect: boolean;

  @CreateDateColumn()
  answeredAt: Date;
}
