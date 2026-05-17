import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import User from '../../../common/entity/user.entity';
import { BundleQuestion } from '../bundle-question.entity/bundle-question.entity';

export enum BundleVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

@Entity('question_bundles')
export class QuestionBundle {
  @PrimaryGeneratedColumn('uuid')
  bundleId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'enum',
    enum: BundleVisibility,
    default: BundleVisibility.PRIVATE,
  })
  visibility!: BundleVisibility;

  @Index()
  @Column({ type: 'text', array: true })
  tags!: string[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => BundleQuestion, (question) => question.bundle)
  questions!: BundleQuestion[];
}
