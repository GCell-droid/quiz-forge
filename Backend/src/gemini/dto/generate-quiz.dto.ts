import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  Min,
  Max,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum QuizDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export class GenerateQuizDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  questionCount?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === 'null' || value === 'undefined'
      ? undefined
      : value,
  )
  @IsUUID()
  fileId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @MaxLength(100)
  gradeLevel?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Topic must be a string' })
  @MaxLength(2000, { message: 'Topic cannot exceed 2000 characters' })
  topic?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Number of questions must be an integer' })
  @Min(1, { message: 'Must have at least 1 question' })
  @Max(50, { message: 'Cannot generate more than 50 questions' })
  numQuestions?: number = 5;

  @IsOptional()
  @IsEnum(QuizDifficulty, {
    message: 'Difficulty must be easy, medium, or hard',
  })
  difficulty?: QuizDifficulty = QuizDifficulty.MEDIUM;
}
