import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export type NoteStatus = 'processing' | 'ready' | 'failed' | 'deleting';

@Entity('teacher_notes')
@Index(['teacherId', 'status'])
export class TeacherNote {
  @PrimaryColumn('uuid') fileId: string;
  @Column() teacherId: string;
  @Column() fileName: string;
  @Column() objectKey: string;
  @Column('integer') size: number;
  @Column('integer') chunkCount: number;
  @Column({ type: 'varchar', default: 'processing' }) status: NoteStatus;
  @CreateDateColumn() createdAt: Date;
}
