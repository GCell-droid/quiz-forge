import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import {
  CreateQuestionBundleDto,
  UpdateQuestionBundleDto,
  CreateBundleQuestionDto,
  UpdateBundleQuestionDto,
} from './dto/bundle.dto';
import { CreateQuizDto, UpdateQuizDto, CreateQuizQuestionDto, UpdateQuizQuestionDto } from './dto/quiz.dto';
import { jwtAuthGuard } from '../auth/guards/jwtguard/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';

@Controller('quizzes')
@UseGuards(jwtAuthGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // --- QUESTION BUNDLE ENDPOINTS ---

  @Post('bundles')
  createBundle(
    @CurrentUser() user: any,
    @Body() data: CreateQuestionBundleDto,
  ) {
    return this.quizzesService.createBundle(user.userId, data);
  }

  @Get('bundles')
  getAllBundles(@CurrentUser() user: any, @Req() req: any) {
    // Read ?tags=js,react from query params if available
    let tags: string[] = [];
    if (req.query.tags) {
      tags = req.query.tags.split(',').map((t: string) => t.trim());
    }

    const isPublicSearch = req.query.public === 'true';

    return this.quizzesService.getAllBundles(
      isPublicSearch ? undefined : user.userId,
      tags,
    );
  }

  @Get('bundles/:bundleId')
  getBundle(@Param('bundleId') bundleId: string) {
    return this.quizzesService.getBundle(bundleId);
  }

  @Patch('bundles/:bundleId')
  updateBundle(
    @CurrentUser() user: any,
    @Param('bundleId') bundleId: string,
    @Body() data: UpdateQuestionBundleDto,
  ) {
    return this.quizzesService.updateBundle(user.userId, bundleId, data);
  }

  @Delete('bundles/:bundleId')
  deleteBundle(@CurrentUser() user: any, @Param('bundleId') bundleId: string) {
    return this.quizzesService.deleteBundle(user.userId, bundleId);
  }

  @Post('bundles/:bundleId/questions')
  addQuestionToBundle(
    @CurrentUser() user: any,
    @Param('bundleId') bundleId: string,
    @Body() data: CreateBundleQuestionDto,
  ) {
    return this.quizzesService.addQuestionToBundle(user.userId, bundleId, data);
  }

  @Patch('bundles/questions/:questionId')
  updateBundleQuestion(
    @CurrentUser() user: any,
    @Param('questionId') questionId: string,
    @Body() data: UpdateBundleQuestionDto,
  ) {
    return this.quizzesService.updateBundleQuestion(user.userId, questionId, data);
  }

  @Delete('bundles/questions/:questionId')
  deleteBundleQuestion(@CurrentUser() user: any, @Param('questionId') questionId: string) {
    return this.quizzesService.deleteBundleQuestion(user.userId, questionId);
  }

  // --- QUIZ ENDPOINTS ---

  @Post()
  createQuiz(@CurrentUser() user: any, @Body() data: CreateQuizDto) {
    return this.quizzesService.createQuiz(user.userId, data);
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
    @Body() data: CreateQuizQuestionDto,
  ) {
    return this.quizzesService.addQuestionToQuiz(user.userId, quizId, data);
  }

  @Patch('questions/:bridgeId')
  updateQuizQuestion(
    @CurrentUser() user: any,
    @Param('bridgeId') bridgeId: string,
    @Body() data: UpdateQuizQuestionDto,
  ) {
    return this.quizzesService.updateQuizQuestion(user.userId, bridgeId, data);
  }

  @Delete('questions/:bridgeId')
  deleteQuizQuestion(@CurrentUser() user: any, @Param('bridgeId') bridgeId: string) {
    return this.quizzesService.deleteQuizQuestion(user.userId, bridgeId);
  }
}
