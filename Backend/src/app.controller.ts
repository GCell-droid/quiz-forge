import {
  Controller,
  Get,
  InternalServerErrorException,
  Query,
  Res,
  VERSION_NEUTRAL,
  Version,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { MetricsService } from './metrics/metrics.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly metrics: MetricsService,
  ) {}

  @Version([VERSION_NEUTRAL, '1'])
  @Get('health')
  runServer(@Query('error') error?: string) {
    if (error === 'true') {
      throw new InternalServerErrorException('Simulated internal server error');
    }
    return 'Server Running';
  }

  @Version([VERSION_NEUTRAL, '1'])
  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    res.setHeader('Content-Type', this.metrics.registry.contentType);
    res.end(await this.metrics.registry.metrics());
  }
}
