/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import cookieParser from 'cookie-parser';

import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { resolveLegacyRoute } from './legacy-routes';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const queryIndex = req.url.indexOf('?');
    const path = queryIndex === -1 ? req.url : req.url.slice(0, queryIndex);
    const query = queryIndex === -1 ? '' : req.url.slice(queryIndex);
    const legacyRoute = resolveLegacyRoute(req.method, path);
    if (legacyRoute) {
      req.method = legacyRoute.method;
      req.url = legacyRoute.path + (query ? `${legacyRoute.path.includes('?') ? '&' : '?'}${query.slice(1)}` : '');
    }
    next();
  });
  app.set('trust proxy', 1);
  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
    throw new Error('FRONTEND_URL is required');
  }

  app.enableCors({
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.useGlobalFilters(new ApiExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: process.env.NODE_ENV === 'production', // true in production
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
