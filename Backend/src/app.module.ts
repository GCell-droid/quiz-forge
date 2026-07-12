import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GeminiModule } from './gemini/gemini.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { QuizzesModule } from './quizzes/quizzes.module';
import { SessionsModule } from './sessions/sessions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UsersModule } from './user/user.module';
import { RedisModule } from './redis/redis.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 5,
      },
    ]),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DB_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      autoLoadEntities: true,
      synchronize: true,
      // dropSchema: true,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrlString =
          configService.get<string>('BULLMQ_REDIS_URL') ||
          configService.get<string>('REDIS_URL') ||
          'redis://localhost:6379';
        const parsedUrl = new URL(redisUrlString);
        return {
          connection: {
            host: parsedUrl.hostname,
            port: parseInt(parsedUrl.port, 10) || 6379,
            password: parsedUrl.password
              ? decodeURIComponent(parsedUrl.password)
              : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    GeminiModule,
    QuizzesModule,
    SessionsModule,
    AnalyticsModule,
    UsersModule,
    RedisModule,
  ],
})
export class AppModule {}
