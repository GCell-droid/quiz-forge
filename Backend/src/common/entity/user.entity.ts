import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../enums/enum';
import { Quiz } from 'src/quizzes/entities/quiz.entity/quiz.entity';
import { QuizSession } from 'src/sessions/entities/quiz-session.entity/quiz-session.entity';

@Entity('UserEntity')
export default class User {
  @PrimaryGeneratedColumn('uuid')
  uid!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 255, unique: true })
  email!: string;

  @Column({ type: 'text', nullable: true })
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role!: UserRole;

  @Column({ length: 50, nullable: true })
  oauthProvider!: string;

  @Column({ length: 255, nullable: true })
  oauthId!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Quiz, (quiz) => quiz.createdBy)
  quizzes!: Quiz[];

  @OneToMany(() => QuizSession, (session) => session.createdBy)
  sessionsCreated!: QuizSession[];
}
