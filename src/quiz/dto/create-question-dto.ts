import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { QuestionType } from '../entites/question.entity';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string; // will map to QuestionEntity.text

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @IsInt()
  @Type(() => Number)
  correctOptionIndex: number;

  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  points?: number;
}
