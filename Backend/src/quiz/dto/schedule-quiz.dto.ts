import { IsInt, IsArray, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleQuizDto {
  @Type(() => Number)
  @IsInt()
  quizId: number;

  @IsDateString()
  scheduledStartTime: string; // keep as string (class-validator expects string)

  @IsDateString()
  scheduledEndTime: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  allowedStudents?: number[];
}
