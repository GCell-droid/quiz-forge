import { QuizEntity } from './quiz.entity';
import { OptionEntity } from './option.entity';
import { ResponseEntity } from './response.entity';
export declare enum QuestionType {
    MCQ = "mcq",
    TRUE_FALSE = "true_false"
}
export declare class QuestionEntity {
    id: number;
    quiz: QuizEntity;
    text: string;
    type: QuestionType;
    marks: number;
    options: OptionEntity[];
    responses: ResponseEntity[];
}
