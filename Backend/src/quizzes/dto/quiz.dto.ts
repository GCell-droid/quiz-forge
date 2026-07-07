import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { QuizStatus, QuizVisibility } from '../entities/quiz.entity/quiz.entity';
import { CreateQuestionDto } from './question.dto';

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

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
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bundleIds?: string[]; // If provided, create quiz from all these bundle questions

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @IsOptional()
  questions?: CreateQuestionDto[];
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
