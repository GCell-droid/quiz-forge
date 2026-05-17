import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested, IsInt, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../entities/question.entity/question.entity';
import { BundleVisibility } from '../entities/question-bundle.entity/question-bundle.entity';

export class CreateBundleQuestionDto {
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

export class CreateQuestionBundleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(BundleVisibility)
  @IsOptional()
  visibility?: BundleVisibility;

  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  @ArrayMaxSize(5, { message: 'A bundle can have a maximum of 5 tags' })
  tags: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBundleQuestionDto)
  @IsOptional()
  questions?: CreateBundleQuestionDto[];
}

export class UpdateQuestionBundleDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(BundleVisibility)
  @IsOptional()
  visibility?: BundleVisibility;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(5, { message: 'A bundle can have a maximum of 5 tags' })
  tags?: string[];
}

export class UpdateBundleQuestionDto {
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
