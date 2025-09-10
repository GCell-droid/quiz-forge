import { AnswerEntity } from 'src/quiz/entites/answer.entity';
import { QuizEntity } from 'src/quiz/entites/quiz.entity';
import { QuizSessionEntity } from 'src/quiz/entites/quizsession.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  password: string; // hashed

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @OneToMany(() => QuizEntity, (quiz) => quiz.author)
  quizzes: QuizEntity[];

  @OneToMany(() => AnswerEntity, (answer) => answer.student)
  answers: AnswerEntity[];

  @ManyToMany(() => QuizSessionEntity, (session) => session.allowedStudents)
  sessions: QuizSessionEntity[];

  @CreateDateColumn()
  createdAt: Date;
}
