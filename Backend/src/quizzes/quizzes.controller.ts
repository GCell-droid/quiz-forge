import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { parsePage } from '../common/pagination';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto, UpdateQuizDto } from './dto/quiz.dto';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { jwtAuthGuard } from '../auth/guards/jwtguard/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/roles-guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/enum';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';

@Controller('quizzes')
@UseGuards(jwtAuthGuard, RoleGuard)
@Roles(UserRole.TEACHER)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // --- QUIZ ENDPOINTS ---

  @Post()
  createQuiz(@CurrentUser() user: any, @Body() data: CreateQuizDto) {
    return this.quizzesService.createQuiz(user.userId, data);
  }

  @Get()
  getAllQuizzes(
    @CurrentUser() user: { userId: string },
    @Query('public') publicOnly?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const isPublicSearch = publicOnly === 'true';
    return this.quizzesService.getAllQuizzes(
      parsePage(page, pageSize),
      isPublicSearch ? undefined : user.userId,
    );
  }

  @Get(':quizId')
  getQuiz(@Param('quizId') quizId: string) {
    return this.quizzesService.getQuiz(quizId);
  }

  @Patch(':quizId')
  updateQuiz(
    @CurrentUser() user: any,
    @Param('quizId') quizId: string,
    @Body() data: UpdateQuizDto,
  ) {
    return this.quizzesService.updateQuiz(user.userId, quizId, data);
  }

  @Delete(':quizId')
  deleteQuiz(@CurrentUser() user: any, @Param('quizId') quizId: string) {
    return this.quizzesService.deleteQuiz(user.userId, quizId);
  }

  @Post(':quizId/questions')
  addQuestionToQuiz(
    @CurrentUser() user: any,
    @Param('quizId') quizId: string,
    @Body() data: CreateQuestionDto,
  ) {
    return this.quizzesService.addQuestionToQuiz(user.userId, quizId, data);
  }

  @Patch('questions/:bridgeId')
  updateQuizQuestion(
    @CurrentUser() user: any,
    @Param('bridgeId') bridgeId: string,
    @Body() data: UpdateQuestionDto,
  ) {
    return this.quizzesService.updateQuizQuestion(user.userId, bridgeId, data);
  }

  @Delete('questions/:bridgeId')
  deleteQuizQuestion(
    @CurrentUser() user: any,
    @Param('bridgeId') bridgeId: string,
  ) {
    return this.quizzesService.deleteQuizQuestion(user.userId, bridgeId);
  }
}
