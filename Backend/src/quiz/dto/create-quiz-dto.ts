import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
} from 'class-validator';
import { CreateQuestionDto } from './create-question-dto';

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  // optional ISO date/time strings or JS Date strings
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  // duration in minutes (optional)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  durationInMinutes?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}
