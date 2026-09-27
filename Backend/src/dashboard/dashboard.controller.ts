import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { jwtAuthGuard } from '../auth/guards/jwtguard/jwt-auth.guard';
import { UserRole } from '../common/enums/enum';
import { DashboardService } from './dashboard.service';

interface DashboardUser {
  userId: string;
  role: UserRole;
}

@Controller('dashboard')
@UseGuards(jwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  getDashboard(@CurrentUser() user: DashboardUser) {
    return this.dashboard.getDashboard(user.userId, user.role);
  }
}
