import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { LeaderboardSnapshot } from './entities/leaderboard-snapshot.entity/leaderboard-snapshot.entity';
import { ResponseAggregation } from './entities/response-aggregation.entity/response-aggregation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaderboardSnapshot, ResponseAggregation]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
