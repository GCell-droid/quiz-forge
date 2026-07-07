import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { BundleVisibility } from '../entities/question-bundle.entity/question-bundle.entity';
import { CreateQuestionDto } from './question.dto';

export class CreateQuestionBundleDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

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
  tags!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @IsOptional()
  questions?: CreateQuestionDto[];
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
