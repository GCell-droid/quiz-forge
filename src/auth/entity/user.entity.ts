import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { QuizEntity } from '../../quiz/entites/quiz.entity';
import { ResponseEntity } from '../../quiz/entites/response.entity';
import { ResultEntity } from '../../quiz/entites/result.entity';
import { Exclude } from 'class-transformer';

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
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  // One teacher/admin can create multiple quizzes
  @OneToMany(() => QuizEntity, (quiz) => quiz.createdBy)
  quizzes: QuizEntity[];

  // One student can have multiple responses
  @OneToMany(() => ResponseEntity, (response) => response.user)
  responses: ResponseEntity[];

  // One student can have multiple results
  @OneToMany(() => ResultEntity, (result) => result.user)
  results: ResultEntity[];
}
