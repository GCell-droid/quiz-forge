import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { QuizModule } from './quiz/quiz.module';
import { StudentSideModule } from './student-side/student-side.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DB_URL,
      ssl: true,
      autoLoadEntities: true,
      synchronize: true, //do it false in production
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    QuizModule,
    StudentSideModule,
  ],
})
export class AppModule {}
