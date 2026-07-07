import { Module } from '@nestjs/common';
import { GeminiController } from './gemini.controller';
import { GeminiService } from './gemini.service';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';

@Module({
  providers: [GeminiService, jwtAuthGuard],
  controllers: [GeminiController],
})
export class GeminiModule {}
