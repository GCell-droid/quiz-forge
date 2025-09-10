import { IsInt } from 'class-validator';

export class SubmitAnswerDto {
  @IsInt()
  questionId: number;

  @IsInt()
  selectedOptionIndex: number; // index of option selected by student
}
