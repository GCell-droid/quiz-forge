import 'dotenv/config';
import { DataSource } from 'typeorm';
import { TeacherNotes1791072000000 } from './gemini/rag/teacher-notes.migration';

export default new DataSource({
  type: 'postgres',
  url: process.env.DB_URL,
  ssl: { rejectUnauthorized: false },
  migrations: [TeacherNotes1791072000000],
});
