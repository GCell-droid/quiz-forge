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
import { BundlesService } from './bundles.service';
import {
  CreateQuestionBundleDto,
  UpdateQuestionBundleDto,
} from './dto/bundle.dto';
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
  constructor(
    private readonly quizzesService: QuizzesService,
    private readonly bundlesService: BundlesService,
  ) {}

  // --- QUESTION BUNDLE ENDPOINTS ---

  @Post('bundles')
  createBundle(
    @CurrentUser() user: any,
    @Body() data: CreateQuestionBundleDto,
  ) {
    return this.bundlesService.createBundle(user.userId, data);
  }

  @Get('bundles')
  getAllBundles(@CurrentUser() user: any, @Req() req: any) {
    // Read ?tags=js,react from query params if available
    let tags: string[] = [];
    if (req.query.tags) {
      tags = req.query.tags.split(',').map((t: string) => t.trim());
    }

    const isPublicSearch = req.query.public === 'true';

    return this.bundlesService.getAllBundles(
      isPublicSearch ? undefined : user.userId,
      tags,
    );
  }

  @Get('bundles/:bundleId')
  getBundle(@Param('bundleId') bundleId: string) {
    return this.bundlesService.getBundle(bundleId);
  }

  @Patch('bundles/:bundleId')
  updateBundle(
    @CurrentUser() user: any,
    @Param('bundleId') bundleId: string,
    @Body() data: UpdateQuestionBundleDto,
  ) {
    return this.bundlesService.updateBundle(user.userId, bundleId, data);
  }

  @Delete('bundles/:bundleId')
  deleteBundle(@CurrentUser() user: any, @Param('bundleId') bundleId: string) {
    return this.bundlesService.deleteBundle(user.userId, bundleId);
  }

  @Post('bundles/:bundleId/questions')
  addQuestionToBundle(
    @CurrentUser() user: any,
    @Param('bundleId') bundleId: string,
    @Body() data: CreateQuestionDto,
  ) {
    return this.bundlesService.addQuestionToBundle(user.userId, bundleId, data);
  }

  @Patch('bundles/questions/:questionId')
  updateBundleQuestion(
    @CurrentUser() user: any,
    @Param('questionId') questionId: string,
    @Body() data: UpdateQuestionDto,
  ) {
    return this.bundlesService.updateBundleQuestion(user.userId, questionId, data);
  }

  @Delete('bundles/questions/:questionId')
  deleteBundleQuestion(@CurrentUser() user: any, @Param('questionId') questionId: string) {
    return this.bundlesService.deleteBundleQuestion(user.userId, questionId);
  }

  // --- QUIZ ENDPOINTS ---

  @Post()
  createQuiz(@CurrentUser() user: any, @Body() data: CreateQuizDto) {
    return this.quizzesService.createQuiz(user.userId, data);
  }

  @Get()
  getAllQuizzes(@CurrentUser() user: any, @Req() req: any) {
    const isPublicSearch = req.query.public === 'true';
    return this.quizzesService.getAllQuizzes(
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
  deleteQuizQuestion(@CurrentUser() user: any, @Param('bridgeId') bridgeId: string) {
    return this.quizzesService.deleteQuizQuestion(user.userId, bridgeId);
  }
}
