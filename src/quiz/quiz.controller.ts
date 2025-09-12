/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
  Param,
  Get,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/auth/entity/user.entity';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { RoleGuard } from 'src/auth/guards/roles-guard/roles.guard';
import { CreateQuizDto } from './dto/create-quiz-dto';
import { ScheduleQuizDto } from './dto/schedule-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Controller('quiz')
@UseGuards(jwtAuthGuard, RoleGuard) // protect all quiz routes
export class QuizController {
  constructor(private readonly quizService: QuizService) {}
  @Post('create-quiz')
  @Roles(UserRole.TEACHER)
  async createQuiz(@Body() dto: CreateQuizDto, @Req() req: any) {
    const teacherId = req?.user?.id; // coming from JWT
    return this.quizService.createQuiz(dto, teacherId);
  }

  @Post('schedule')
  @Roles(UserRole.TEACHER)
  async scheduleQuiz(@Body() schdto: ScheduleQuizDto, @Req() req: any) {
    console.log(schdto);
    const teacherId = req?.user?.id;
    return this.quizService.scheduleQuiz(schdto, teacherId);
  }

  /**
   * Get quiz with questions
   */
  @Get(':id')
  async getQuiz(@Param('id', ParseIntPipe) quizId: number) {
    return this.quizService.getQuiz(quizId);
  }
  @Post('submit-answer')
  @UseGuards(jwtAuthGuard)
  async submitAnswer(@Request() req, @Body() dto: SubmitAnswerDto) {
    const user = req.user; // your JwtAuthGuard returns user with id & role
    if (!user || user.role !== 'student') {
      throw new ForbiddenException('Only students can submit answers');
    }
    return this.quizService.submitAnswer(user.id, dto);
  }
  @Post('join')
  @UseGuards(jwtAuthGuard)
  async joinQuiz(@Req() req, @Body('joinCode') joinCode: string) {
    return this.quizService.joinQuiz(req.user.id, joinCode);
  }
}
