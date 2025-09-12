// src/quiz/dto/submit-answer.dto.ts
import { IsInt } from 'class-validator';

export class SubmitAnswerDto {
  @IsInt()
  sessionId: number;

  @IsInt()
  questionId: number;

  @IsInt()
  selectedOptionIndex: number;
}
