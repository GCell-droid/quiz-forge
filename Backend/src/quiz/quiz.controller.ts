/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import { QuizService } from './quiz.service';

import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { RoleGuard } from 'src/auth/guards/roles-guard/roles.guard';
import { GoogleOrJwtAuthGuard } from 'src/auth/guards/combinedGuard/combined-auth.guard';
import { CreateQuizDto } from './dto/create-quiz-dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/auth/entity/user.entity';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}
  @Roles(UserRole.TEACHER)
  @UseGuards(GoogleOrJwtAuthGuard, RoleGuard)
  @Post('/create-quiz')
  async CreateQuizDto(
    @Req() req: Request & { user?: any },
    @Body() quizz: CreateQuizDto,
  ) {
    return await this.quizService.createQuiz(req.user.id, quizz);
  }

  @UseGuards(GoogleOrJwtAuthGuard)
  @Get(':quizId/join')
  async joinQuiz(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Request() req,
  ) {
    const userId = req.user.id;
    return await this.quizService.getQuizForStudent(quizId, userId);
  }

  /**
   * Get student's responses for a quiz
   */
  @UseGuards(GoogleOrJwtAuthGuard, RoleGuard)
  @Get(':quizId/my-responses')
  async getMyResponses(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Request() req,
  ) {
    const userId = req.user.id;
    return await this.quizService.getStudentResponses(userId, quizId);
  }

  @Roles(UserRole.TEACHER)
  @UseGuards(GoogleOrJwtAuthGuard, RoleGuard)
  @Get(':quizId/stats')
  async getQuizStats(@Param('quizId', ParseIntPipe) quizId: number) {
    return await this.quizService.getQuizStats(quizId);
  }

  /**
   * Get question statistics (Teacher only)
   */
  @Roles(UserRole.TEACHER)
  @UseGuards(GoogleOrJwtAuthGuard, RoleGuard)
  @Get(':quizId/questions/:questionId/stats')
  async getQuestionStats(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    return await this.quizService.getQuestionStats(quizId, questionId);
  }

  /**
   * Get live responses (Teacher only)
   */
  @Roles(UserRole.TEACHER)
  @UseGuards(GoogleOrJwtAuthGuard, RoleGuard)
  @Get(':quizId/live-responses')
  async getLiveResponses(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Request() req,
  ) {
    const teacherId = req.user.id;
    await this.quizService.verifyQuizOwnership(quizId, teacherId);
    return await this.quizService.getLiveResponses(quizId);
  }

  /**
   * Get leaderboard
   */

  @UseGuards(GoogleOrJwtAuthGuard)
  @Get(':quizId/leaderboard')
  async getLeaderboard(@Param('quizId', ParseIntPipe) quizId: number) {
    return await this.quizService.getLeaderboard(quizId);
  }

  /**
   * Submit answer via REST (alternative to WebSocket)
   */
  @UseGuards(GoogleOrJwtAuthGuard)
  @Post(':quizId/questions/:questionId/answer')
  async submitAnswer(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() body: { optionId: number },
    @Request() req,
  ) {
    const userId = req.user.id;
    return await this.quizService.submitResponse(
      userId,
      quizId,
      questionId,
      body.optionId,
    );
  }

  /**
   * Submit quiz
   */

  @UseGuards(GoogleOrJwtAuthGuard)
  @Post(':quizId/submit')
  async submitQuiz(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Request() req,
  ) {
    const userId = req.user.id;
    return await this.quizService.submitQuiz(userId, quizId);
  }
  @Get('/getallquiz')
  async getQuiz() {
    return this.quizService.getAllquiz();
  }
  @Get('/getallresponse')
  async getallresponse() {
    return this.quizService.getAllResponse();
  }
  @Get('/getallquestion')
  async getallquest() {
    return this.quizService.getAllQuestion();
  }
  @Get('/getalloption')
  async getallopt() {
    return this.quizService.getAllOption();
  }
}
