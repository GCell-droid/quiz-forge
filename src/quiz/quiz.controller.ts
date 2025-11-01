/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';

import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { RoleGuard } from 'src/auth/guards/roles-guard/roles.guard';
import { GoogleOrJwtAuthGuard } from 'src/auth/guards/combinedGuard/combined-auth.guard';
import { CreateQuizDto } from './dto/create-quiz-dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/auth/entity/user.entity';

@Controller('quiz')
@UseGuards(jwtAuthGuard, RoleGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}
  @Post('/create-quiz')
  @UseGuards(GoogleOrJwtAuthGuard)
  @Roles(UserRole.TEACHER)
  async CreateQuizDto(
    @Req() req: Request & { user?: any },
    @Body() quizz: CreateQuizDto,
  ) {
    return await this.quizService.createQuiz(req.user.id, quizz);
  }
}
