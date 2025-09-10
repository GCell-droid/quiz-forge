import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz-dto';
import { ScheduleQuizDto } from './dto/schedule-quiz.dto';
export declare class QuizController {
    private readonly quizService;
    constructor(quizService: QuizService);
    createQuiz(dto: CreateQuizDto, req: any): Promise<import("./entites/quiz.entity").QuizEntity>;
    scheduleQuiz(dto: ScheduleQuizDto, req: any): Promise<import("./entites/quizsession.entity").QuizSessionEntity>;
}
