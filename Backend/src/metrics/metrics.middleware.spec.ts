import { MetricsMiddleware } from './metrics.middleware';
import { MetricsService } from './metrics.service';
import { EventEmitter } from 'events';
import type { Request, Response, NextFunction } from 'express';

describe('MetricsMiddleware', () => {
  let middleware: MetricsMiddleware;
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService();
    middleware = new MetricsMiddleware(metricsService);
  });

  it('should skip instrumentation for /metrics', () => {
    const next: NextFunction = jest.fn();
    const req = {
      path: '/metrics',
      originalUrl: '/metrics',
    } as unknown as Request;
    const res = new EventEmitter() as unknown as Response;

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();

    res.emit('finish');
  });

  it('should normalize route using req.route.path and req.baseUrl', async () => {
    const next: NextFunction = jest.fn();
    const req = {
      method: 'GET',
      path: '/v1/users/12345',
      baseUrl: '/v1/users',
      route: { path: '/:id' },
    } as unknown as Request;
    const res = Object.assign(new EventEmitter(), {
      statusCode: 200,
    }) as unknown as Response;

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();

    res.emit('finish');

    const metricsText = await metricsService.registry.metrics();
    expect(metricsText).toContain('route="/v1/users/:id"');
    expect(metricsText).not.toContain('12345');
  });

  it('should use "unmatched" route for unmatched routes to avoid high cardinality', async () => {
    const next: NextFunction = jest.fn();
    const req = {
      method: 'GET',
      path: '/random/garbage/path/999',
      baseUrl: '',
    } as unknown as Request;
    const res = Object.assign(new EventEmitter(), {
      statusCode: 404,
    }) as unknown as Response;

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();

    res.emit('finish');

    const metricsText = await metricsService.registry.metrics();
    expect(metricsText).toContain('route="unmatched"');
    expect(metricsText).toContain('status_code="404"');
    expect(metricsText).not.toContain('garbage');
  });
});
