import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '../common/enums/enum';
import { RedisService } from '../redis/redis.service';
import {
  DashboardRepository,
  StudentDashboard,
  TeacherDashboard,
} from './dashboard.repository';

const DASHBOARD_TTL_SECONDS = 60;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly repository: DashboardRepository,
    private readonly redis: RedisService,
  ) {}

  async getDashboard(
    userId: string,
    role: UserRole,
  ): Promise<TeacherDashboard | StudentDashboard> {
    const dashboardRole = role === UserRole.TEACHER ? 'teacher' : 'student';
    const key = `dashboard:v1:${dashboardRole}:${userId}`;

    try {
      const cached = await this.redis.get(key);
      if (cached)
        return JSON.parse(cached) as TeacherDashboard | StudentDashboard;
    } catch {
      this.logger.warn('Dashboard cache read failed; using database');
    }

    const dashboard =
      dashboardRole === 'teacher'
        ? await this.repository.getTeacherDashboard(userId)
        : await this.repository.getStudentDashboard(userId);

    try {
      await this.redis.set(
        key,
        JSON.stringify(dashboard),
        DASHBOARD_TTL_SECONDS,
      );
    } catch {
      this.logger.warn('Dashboard cache write failed');
    }
    return dashboard;
  }
}
