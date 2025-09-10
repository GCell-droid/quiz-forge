/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/auth/entity/user.entity';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { RoleGuard } from 'src/auth/guards/roles-guard/roles.guard';
import { CreateQuizDto } from './dto/create-quiz-dto';
import { ScheduleQuizDto } from './dto/schedule-quiz.dto';

@Controller('quiz')
@UseGuards(jwtAuthGuard, RoleGuard) // protect all quiz routes
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /**
   * Create a quiz with questions
   * Example request body:
   {
     "title": "Math Quiz",
     "description": "Algebra basics",
     "timerSeconds": 600,
     "questions": [
       {
         "text": "2+2=?",
         "options": ["3","4","5"],
         "correctAnswerIndex": 1
       }
     ]
   }
   */
  @Post('create-quiz')
  @Roles(UserRole.TEACHER)
  async createQuiz(@Body() dto: CreateQuizDto, @Req() req: any) {
    const teacherId = req.user.id; // coming from JWT
    return this.quizService.createQuiz(dto, teacherId);
  }

  /**
   * Schedule a quiz session
   * Example request body:
   * {
   *   "quizId": 1,
   *   "scheduledStartTime": "2025-09-10T10:00:00Z",
   *   "scheduledEndTime": "2025-09-10T10:30:00Z",
   *   "allowedStudents": [2,3,4]
   * }
   */
  @Post('schedule')
  @Roles(UserRole.TEACHER)
  async scheduleQuiz(@Body() dto: ScheduleQuizDto, @Req() req: any) {
    const teacherId = req?.user?.id;
    return this.quizService.scheduleQuiz(dto, teacherId);
  }

  /**
   * Get quiz with questions
   */
  //   @Get(':id')
  //   async getQuiz(@Param('id', ParseIntPipe) quizId: number) {
  //     return this.quizService.getQuiz(quizId);
  //   }
}
