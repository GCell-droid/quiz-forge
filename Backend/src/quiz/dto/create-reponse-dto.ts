import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateResponseDto {
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  quizId: number;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  questionId: number;

  @IsString()
  @IsOptional()
  selectedAnswer?: string;
}
