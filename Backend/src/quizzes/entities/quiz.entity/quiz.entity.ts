import User from 'src/common/entity/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Question } from '../question.entity/question.entity';

export enum QuizStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum QuizVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  quizId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @ManyToOne(() => User, (user) => user.quizzes)
  @JoinColumn({ name: 'createdBy' })
  createdBy!: User;

  @Column({ type: 'enum', enum: QuizStatus, default: QuizStatus.DRAFT })
  status!: QuizStatus;

  @Column({
    type: 'enum',
    enum: QuizVisibility,
    default: QuizVisibility.PRIVATE,
  })
  visibility!: QuizVisibility;

  @Column({ type: 'text', array: true, nullable: true })
  tags!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Question, (question) => question.quiz)
  questions!: Question[];
}
