import { Module } from '@nestjs/common';
import { GeminiController } from './presenters/http/gemini.controller';
import { GeminiService } from './application/gemini.service';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';

@Module({
  providers: [GeminiService, jwtAuthGuard],
  controllers: [GeminiController],
})
export class GeminiModule {}
