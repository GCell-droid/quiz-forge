import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';
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

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  selectedOptionId?: number;
}
