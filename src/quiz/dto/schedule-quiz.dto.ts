import { IsInt, IsArray, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleQuizDto {
  @IsInt()
  @Type(() => Number) // converts string to number from JSON body
  quizId: number;

  @IsDateString()
  scheduledStartTime: string; // JSON string in ISO 8601

  @IsDateString()
  scheduledEndTime: string; // JSON string in ISO 8601

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number) // converts array of string numbers to integers
  allowedStudents?: number[];
}
