import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MetricsService } from './metrics/metrics.service';
import type { Response } from 'express';

describe('AppController', () => {
  let appController: AppController;
  let metricsService: MetricsService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, MetricsService],
    }).compile();

    appController = app.get<AppController>(AppController);
    metricsService = app.get<MetricsService>(MetricsService);
  });

  describe('health', () => {
    it('reports that the server is running', () => {
      expect(appController.runServer()).toBe('Server Running');
    });

    it('throws InternalServerErrorException when error=true is requested', () => {
      expect(() => appController.runServer('true')).toThrow();
    });
  });

  describe('metrics', () => {
    it('serves prometheus metrics with appropriate content-type', async () => {
      const setHeader = jest.fn();
      const end = jest.fn();
      const mockRes = { setHeader, end } as unknown as Response;

      await appController.getMetrics(mockRes);

      expect(setHeader).toHaveBeenCalledWith(
        'Content-Type',
        metricsService.registry.contentType,
      );
      expect(end).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
