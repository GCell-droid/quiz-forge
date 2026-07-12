import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { jwtAuthGuard } from '../auth/guards/jwtguard/jwt-auth.guard';
import { RoleGuard } from '../auth/guards/roles-guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/enum';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';

@Controller('sessions')
@UseGuards(jwtAuthGuard, RoleGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('schedule')
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

  @Get('hosted')
  @Roles(UserRole.TEACHER)
  async getHostedSessions(@CurrentUser() user: any) {
    return this.sessionsService.getHostedSessions(user.userId);
  }

  @Get('history')
  async getMyHistory(@CurrentUser() user: any) {
    return this.sessionsService.getMyHistory(user.userId);
  }

  @Get(':sessionId')
  async getSessionStats(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionsService.getSessionStats(user.userId, sessionId);
  }

  @Get(':sessionId/my-results')
  async getMyResults(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionsService.getMyResults(user.userId, sessionId);
  }
}
