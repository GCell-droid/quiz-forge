import { QuizEntity } from './quiz.entity';
import { AnswerEntity } from './answer.entity';
export declare class QuestionEntity {
    id: number;
    text: string;
    options: string[];
    correctAnswerIndex: number;
    quiz: QuizEntity;
    answers: AnswerEntity[];
}
