import {
  IsString,
  IsInt,
  IsEnum,
  IsNotEmpty,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export enum QuizDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export class GenerateQuizDto {
  @IsString()
  @IsNotEmpty({ message: 'Topic is required' })
  @MaxLength(2000, { message: 'Topic cannot exceed 2000 characters' })
  topic: string;

  @IsInt({ message: 'Number of questions must be an integer' })
  @Min(1, { message: 'Must have at least 1 question' })
  @Max(50, { message: 'Cannot generate more than 50 questions' })
  numQuestions?: number = 5;

  @IsEnum(QuizDifficulty, {
    message: 'Difficulty must be easy, medium, or hard',
  })
  difficulty?: QuizDifficulty = QuizDifficulty.MEDIUM;
}
