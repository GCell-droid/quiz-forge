import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { QuestionEntity } from './question.entity';

@Entity('option')
export class OptionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => QuestionEntity, (question) => question.options, {
    onDelete: 'CASCADE',
  })
  question: QuestionEntity;

  @Column()
  text: string;

  @Column({ default: false })
  isCorrect: boolean;
}
