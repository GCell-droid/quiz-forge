import { UserRole } from '../common/enums/enum';
import { DashboardRepository, TeacherDashboard } from './dashboard.repository';
import { DashboardService } from './dashboard.service';
import { RedisService } from '../redis/redis.service';

describe('DashboardService', () => {
  const summary: TeacherDashboard = {
    role: 'teacher',
    bundles: { count: 1, recent: [{ bundleId: 'bundle-1', title: 'Math' }] },
    quizzes: { count: 0, recent: [] },
    sessions: { count: 0, recent: [] },
  };

  const repository = {
    getTeacherDashboard: jest.fn().mockResolvedValue(summary),
    getStudentDashboard: jest.fn(),
  };
  const redis = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
  };
  const service = new DashboardService(
    repository as unknown as DashboardRepository,
    redis as unknown as RedisService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('caches a teacher summary with a 60 second TTL and a user-specific key', async () => {
    redis.get.mockResolvedValueOnce(null);

    expect(await service.getDashboard('teacher-1', UserRole.TEACHER)).toEqual(
      summary,
    );
    expect(repository.getTeacherDashboard).toHaveBeenCalledWith('teacher-1');
    expect(redis.set).toHaveBeenCalledWith(
      'dashboard:v1:teacher:teacher-1',
      JSON.stringify(summary),
      60,
    );
  });

  it('uses the cached summary without querying the database', async () => {
    redis.get.mockResolvedValueOnce(JSON.stringify(summary));

    expect(await service.getDashboard('teacher-1', UserRole.TEACHER)).toEqual(
      summary,
    );
    expect(repository.getTeacherDashboard).not.toHaveBeenCalled();
  });

  it('uses the database if Redis is unavailable', async () => {
    redis.get.mockRejectedValueOnce(new Error('Redis unavailable'));
    redis.set.mockRejectedValueOnce(new Error('Redis unavailable'));

    expect(await service.getDashboard('teacher-2', UserRole.TEACHER)).toEqual(
      summary,
    );
    expect(repository.getTeacherDashboard).toHaveBeenCalledWith('teacher-2');
  });
});
