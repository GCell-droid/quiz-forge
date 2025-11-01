import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../auth/entity/user.entity';
import { QuestionEntity } from './question.entity';
import { ResponseEntity } from './response.entity';
import { ResultEntity } from './result.entity';

@Entity('quiz')
export class QuizEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  // foreign key column
  @Column()
  createdById: number;

  @ManyToOne(() => UserEntity, (user) => user.quizzes, {
    onDelete: 'CASCADE',
    eager: false, // don’t automatically load the user
  })
  @JoinColumn({ name: 'createdById' }) // binds createdById <-> user.id
  createdBy: UserEntity;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endAt: Date;

  @Column({ type: 'int', nullable: true })
  timeLimit: number;

  @OneToMany(() => QuestionEntity, (question) => question.quiz)
  questions: QuestionEntity[];

  @OneToMany(() => ResponseEntity, (response) => response.quiz)
  responses: ResponseEntity[];

  @OneToMany(() => ResultEntity, (result) => result.quiz)
  results: ResultEntity[];

  @CreateDateColumn()
  createdAt: Date;
}
