import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { QuizEntity } from './quiz.entity';
import { OptionEntity } from './option.entity';
import { ResponseEntity } from './response.entity';

export enum QuestionType {
  MCQ = 'mcq',
  TRUE_FALSE = 'true_false',
}

@Entity('question')
export class QuestionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => QuizEntity, (quiz) => quiz.questions, {
    onDelete: 'CASCADE',
  })
  quiz: QuizEntity;

  @Column({ type: 'text' })
  text: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MCQ,
  })
  type: QuestionType;

  @Column({ type: 'int', default: 1 })
  marks: number;

  @OneToMany(() => OptionEntity, (option) => option.question)
  options: OptionEntity[];

  @OneToMany(() => ResponseEntity, (response) => response.question)
  responses: ResponseEntity[];
}
