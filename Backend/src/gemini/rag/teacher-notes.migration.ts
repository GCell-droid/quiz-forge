import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TeacherNotes1791072000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE IF NOT EXISTS teacher_notes (
      "fileId" uuid PRIMARY KEY, "teacherId" varchar NOT NULL,
      "fileName" varchar NOT NULL, "objectKey" varchar NOT NULL,
      size integer NOT NULL CHECK (size >= 0),
      "chunkCount" integer NOT NULL CHECK ("chunkCount" >= 0),
      status varchar NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'ready', 'failed', 'deleting')),
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(
      'CREATE INDEX IF NOT EXISTS teacher_notes_teacher_status ON teacher_notes ("teacherId", status)',
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE IF EXISTS teacher_notes');
  }
}
