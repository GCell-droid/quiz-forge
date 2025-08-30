import {
  Column,
  CreateDateColumn,
  // OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ unique: true })
  email: string;
  @Column()
  name: string;
  @Column()
  password: string; //hashing it
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;
  // @OneToMany(() => Quiz, (post) => post.author)
  // quizes: Quiz[];
  @CreateDateColumn()
  createdAt: Date;
}
