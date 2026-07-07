import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt } from 'class-validator';
import { QuestionType } from '../entities/question.entity/question.entity';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsOptional()
  options?: any;

  @IsOptional()
  correctAnswer?: any;

  @IsInt()
  @IsOptional()
  points?: number;

  @IsInt()
  @IsOptional()
  displayOrder?: number;
}

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(QuestionType)
  @IsOptional()
  type?: QuestionType;

  @IsOptional()
  options?: any;

  @IsOptional()
  correctAnswer?: any;

  @IsInt()
  @IsOptional()
  points?: number;

  @IsInt()
  @IsOptional()
  displayOrder?: number;
}
