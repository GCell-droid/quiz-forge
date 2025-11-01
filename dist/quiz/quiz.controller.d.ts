import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz-dto';
export declare class QuizController {
    private readonly quizService;
    constructor(quizService: QuizService);
    CreateQuizDto(req: Request & {
        user?: any;
    }, quizz: CreateQuizDto): Promise<import("./entites/quiz.entity").QuizEntity>;
}
