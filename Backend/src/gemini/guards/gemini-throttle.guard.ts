import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GeminiThrottle extends ThrottlerGuard {
  protected async getLimit(): Promise<number> {
    return Promise.resolve(5);
  }
  protected async getTtl(): Promise<number> {
    return Promise.resolve(60000);
  }
  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Too many attempts');
  }
}
