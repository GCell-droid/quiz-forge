import { Module } from '@nestjs/common';
import { GeminiController } from './presenters/http/gemini.controller';
import { GeminiService } from './application/gemini.service';

@Module({
  providers: [GeminiService],
  controllers: [GeminiController],
})
export class GeminiModule {}
