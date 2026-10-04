import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GeminiModule } from './gemini/gemini.module';
import { TeacherNotes1791072000000 } from './gemini/rag/teacher-notes.migration';
import { ThrottlerModule } from '@nestjs/throttler';
import { QuizzesModule } from './quizzes/quizzes.module';
import { SessionsModule } from './sessions/sessions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UsersModule } from './user/user.module';
import { RedisModule } from './redis/redis.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsMiddleware } from './metrics/metrics.middleware';

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
      migrations: [TeacherNotes1791072000000],
      migrationsRun: true,
      extra: {
        max: 10,
        idleTimeoutMillis: 300000,
        connectionTimeoutMillis: 10000,
      },
      // synchronize: true,
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
        const isTls = parsedUrl.protocol === 'rediss:';
        return {
          connection: {
            host: parsedUrl.hostname,
            port: parseInt(parsedUrl.port, 10) || 6379,
            username: parsedUrl.username
              ? decodeURIComponent(parsedUrl.username)
              : undefined,
            password: parsedUrl.password
              ? decodeURIComponent(parsedUrl.password)
              : undefined,
            tls: isTls ? { rejectUnauthorized: false } : undefined,
            maxRetriesPerRequest: null,
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
    DashboardModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware)
      .exclude('metrics', 'v1/metrics')
      .forRoutes('*');
  }
}
