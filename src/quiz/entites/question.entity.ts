import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuizEntity } from './quiz.entity';
import { AnswerEntity } from './answer.entity';

@Entity('question')
export class QuestionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  text: string;

  @Column('simple-array')
  options: string[]; // ["A", "B", "C", "D"]

  @Column()
  correctAnswerIndex: number;

  @ManyToOne(() => QuizEntity, (quiz) => quiz.questions, {
    onDelete: 'CASCADE',
  })
  quiz: QuizEntity;

  @OneToMany(() => AnswerEntity, (a) => a.question)
  answers: AnswerEntity[];

  @Column()
  marks: number;
}
