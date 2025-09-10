import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  JoinTable,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuizEntity } from './quiz.entity';
import { UserEntity } from 'src/auth/entity/user.entity';
import { AnswerEntity } from './answer.entity';

@Entity('quiz_session')
export class QuizSessionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => QuizEntity, { onDelete: 'CASCADE' })
  quiz: QuizEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  teacher: UserEntity;

  @Column({ unique: true })
  joinCode: string;

  @OneToMany(() => AnswerEntity, (a) => a.session)
  answers: AnswerEntity[];

  @ManyToMany(() => UserEntity, (user) => user.sessions)
  @JoinTable({
    name: 'session_students',
    joinColumn: { name: 'sessionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'studentId', referencedColumnName: 'id' },
  })
  allowedStudents: UserEntity[];

  @Column({ default: false })
  isActive: boolean;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  endedAt: Date;

  @Column({ nullable: true })
  scheduledStartTime: Date;

  @Column({ nullable: true })
  scheduledEndTime: Date;

  @CreateDateColumn()
  createdAt: Date;
}
