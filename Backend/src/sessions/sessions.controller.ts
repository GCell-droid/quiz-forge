import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { jwtAuthGuard } from '../auth/guards/jwtguard/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/roles-guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/enum';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { parsePage } from '../common/pagination';

@Controller('sessions')
@UseGuards(jwtAuthGuard, RoleGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  async scheduleSession(
    @CurrentUser() user: any,
    @Body() body: { quizId: string; scheduledStart: string; timeLimit: number },
  ) {
    return this.sessionsService.scheduleSession(
      user.userId,
      body.quizId,
      new Date(body.scheduledStart),
      body.timeLimit,
    );
  }

  @Get()
  async listSessions(
    @CurrentUser() user: any,
    @Query('view') view: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const options = parsePage(page, pageSize);
    if (view === 'hosted') {
      if (user.role !== UserRole.TEACHER) {
        throw new ForbiddenException('Only teachers can view hosted sessions');
      }
      return this.sessionsService.getHostedSessions(user.userId, options);
    }
    if (view === 'history') {
      return this.sessionsService.getMyHistory(user.userId, options);
    }
    throw new BadRequestException('view must be hosted or history');
  }

  @Get(':sessionId')
  async getSessionStats(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionsService.getSessionStats(user.userId, sessionId);
  }

  @Get(':sessionId/results/me')
  async getMyResults(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionsService.getMyResults(user.userId, sessionId);
  }
}
