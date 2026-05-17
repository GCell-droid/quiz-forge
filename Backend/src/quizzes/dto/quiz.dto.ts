import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsEnum, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { QuizStatus, QuizVisibility } from '../entities/quiz.entity/quiz.entity';
import { QuestionType } from '../entities/question.entity/question.entity';

export class CreateQuizQuestionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsOptional()
  options: any;

  @IsOptional()
  correctAnswer: any;

  @IsInt()
  @IsOptional()
  points?: number;

  @IsInt()
  @IsOptional()
  displayOrder?: number;
}

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(QuizStatus)
  @IsOptional()
  status?: QuizStatus;

  @IsEnum(QuizVisibility)
  @IsOptional()
  visibility?: QuizVisibility;

  @IsArray()
  @IsOptional()
  tags?: string[];
  
  @IsString()
  @IsOptional()
  bundleId?: string; // If provided, create quiz from bundle questions

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  @IsOptional()
  questions?: CreateQuizQuestionDto[];
}

export class UpdateQuizDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(QuizStatus)
  @IsOptional()
  status?: QuizStatus;

  @IsEnum(QuizVisibility)
  @IsOptional()
  visibility?: QuizVisibility;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class UpdateQuizQuestionDto {
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
