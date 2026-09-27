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
  BadRequestException,
} from '@nestjs/common';
import { parsePage } from '../common/pagination';
import { BundlesService } from './bundles.service';
import {
  CreateQuestionBundleDto,
  UpdateQuestionBundleDto,
} from './dto/bundle.dto';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { jwtAuthGuard } from '../auth/guards/jwtguard/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/roles-guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/enum';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';

@Controller('bundles')
@UseGuards(jwtAuthGuard, RoleGuard)
@Roles(UserRole.TEACHER)
export class BundlesController {
  constructor(private readonly bundlesService: BundlesService) {}

  // --- QUESTION BUNDLE ENDPOINTS ---

  @Post()
  createBundle(
    @CurrentUser() user: any,
    @Body() data: CreateQuestionBundleDto,
  ) {
    return this.bundlesService.createBundle(user.userId, data);
  }

  @Get()
  getAllBundles(
    @CurrentUser() user: { userId: string },
    @Query('public') publicOnly?: string,
    @Query('tags') tagQuery?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (tagQuery !== undefined && typeof tagQuery !== 'string') {
      throw new BadRequestException('tags must be comma-separated');
    }
    const tags = tagQuery
      ? tagQuery
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    const isPublicSearch = publicOnly === 'true';

    return this.bundlesService.getAllBundles(
      parsePage(page, pageSize),
      isPublicSearch ? undefined : user.userId,
      tags,
    );
  }

  @Get(':bundleId')
  getBundle(@Param('bundleId') bundleId: string) {
    return this.bundlesService.getBundle(bundleId);
  }

  @Patch(':bundleId')
  updateBundle(
    @CurrentUser() user: any,
    @Param('bundleId') bundleId: string,
    @Body() data: UpdateQuestionBundleDto,
  ) {
    return this.bundlesService.updateBundle(user.userId, bundleId, data);
  }

  @Delete(':bundleId')
  deleteBundle(@CurrentUser() user: any, @Param('bundleId') bundleId: string) {
    return this.bundlesService.deleteBundle(user.userId, bundleId);
  }

  @Post(':bundleId/questions')
  addQuestionToBundle(
    @CurrentUser() user: any,
    @Param('bundleId') bundleId: string,
    @Body() data: CreateQuestionDto,
  ) {
    return this.bundlesService.addQuestionToBundle(user.userId, bundleId, data);
  }

  @Patch('questions/:questionId')
  updateBundleQuestion(
    @CurrentUser() user: any,
    @Param('questionId') questionId: string,
    @Body() data: UpdateQuestionDto,
  ) {
    return this.bundlesService.updateBundleQuestion(
      user.userId,
      questionId,
      data,
    );
  }

  @Delete('questions/:questionId')
  deleteBundleQuestion(
    @CurrentUser() user: any,
    @Param('questionId') questionId: string,
  ) {
    return this.bundlesService.deleteBundleQuestion(user.userId, questionId);
  }
}
