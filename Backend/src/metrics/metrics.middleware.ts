import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Avoid instrumenting the /metrics endpoint itself
    const path = req.baseUrl || req.path || '';
    if (
      path === '/metrics' ||
      path === '/v1/metrics' ||
      req.originalUrl === '/metrics' ||
      req.originalUrl === '/v1/metrics' ||
      req.originalUrl?.startsWith('/metrics') ||
      req.originalUrl?.startsWith('/v1/metrics')
    ) {
      return next();
    }

    const start = process.hrtime();

    res.on('finish', () => {
      const diff = process.hrtime(start);
      const duration = diff[0] + diff[1] / 1e9;

      let route = 'unmatched';
      const reqWithRoute = req as unknown as {
        route?: { path?: string | RegExp };
      };
      if (reqWithRoute.route?.path) {
        const rawPath: string | RegExp = reqWithRoute.route.path;
        const routePath: string =
          typeof rawPath === 'string' ? rawPath : String(rawPath);
        const base = req.baseUrl || '';
        route = `${base}${routePath}`.replace(/\/+/g, '/');
        if (route.length > 1 && route.endsWith('/')) {
          route = route.slice(0, -1);
        }
      }

      const statusCode = res.statusCode.toString();

      this.metrics.httpRequestDuration
        .labels(req.method, route, statusCode)
        .observe(duration);

      this.metrics.httpRequestsTotal
        .labels(req.method, route, statusCode)
        .inc();
    });

    next();
  }
}
