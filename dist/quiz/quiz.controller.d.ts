import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz-dto';
import { ScheduleQuizDto } from './dto/schedule-quiz.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
export declare class QuizController {
    private readonly quizService;
    constructor(quizService: QuizService);
    createQuiz(dto: CreateQuizDto, req: any): Promise<import("./entites/quiz.entity").QuizEntity>;
    scheduleQuiz(schdto: ScheduleQuizDto, req: any): Promise<import("./entites/quizsession.entity").QuizSessionEntity>;
    getQuiz(quizId: number): Promise<import("./entites/quiz.entity").QuizEntity>;
    submitAnswer(req: any, dto: SubmitAnswerDto): Promise<{
        ok: boolean;
        answerId: number;
    }>;
    joinQuiz(req: any, joinCode: string): Promise<{
        sessionId: number;
        quizId: number;
        title: string;
        description: string;
        timerSeconds: number;
        questions: {
            id: number;
            text: string;
            options: string[];
            marks: number;
        }[];
    }>;
}
