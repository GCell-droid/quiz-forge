import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    const isTls = redisUrl.startsWith('rediss://');

    this.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
    });

    this.redisClient.on('error', (err) => {
      this.logger.error(
        `[RedisService] Redis connection error: ${err.message}`,
      );
    });

    this.redisClient.on('connect', () => {
      this.logger.log('[RedisService] Connected to Redis successfully');
    });
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redisClient.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async hset(
    key: string,
    fieldOrData: string | Record<string, string>,
    value?: string,
  ): Promise<number> {
    if (typeof fieldOrData === 'object' && fieldOrData !== null) {
      return this.redisClient.hset(key, fieldOrData);
    }
    return this.redisClient.hset(key, fieldOrData, value!);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redisClient.hgetall(key);
  }

  async exists(key: string): Promise<number> {
    return this.redisClient.exists(key);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.redisClient.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redisClient.smembers(key);
  }

  getClient(): Redis {
    return this.redisClient;
  }
}
