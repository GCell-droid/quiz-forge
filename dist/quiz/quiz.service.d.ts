import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { UserEntity } from 'src/auth/entity/user.entity';
import { QuizEntity } from './entites/quiz.entity';
import { QuestionEntity } from './entites/question.entity';
import { QuizSessionEntity } from './entites/quizsession.entity';
import { ScheduleQuizDto } from './dto/schedule-quiz.dto';
import { CreateQuizDto } from './dto/create-quiz-dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { AnswerEntity } from './entites/answer.entity';
import { QuizGateway } from './gateway/quiz.gateway';
export declare class QuizService {
    private quizRepo;
    private questionRepo;
    private sessionRepo;
    private userRepo;
    private schedulerRegistry;
    private readonly answerRepo;
    private readonly quizGateway;
    constructor(quizRepo: Repository<QuizEntity>, questionRepo: Repository<QuestionEntity>, sessionRepo: Repository<QuizSessionEntity>, userRepo: Repository<UserEntity>, schedulerRegistry: SchedulerRegistry, answerRepo: Repository<AnswerEntity>, quizGateway: QuizGateway);
    createQuiz(dto: CreateQuizDto, teacherId: number): Promise<QuizEntity>;
    scheduleQuiz(dto: ScheduleQuizDto, teacherId: number): Promise<QuizSessionEntity>;
    getQuiz(quizId: number): Promise<QuizEntity>;
    private addCronJob;
    submitAnswer(studentId: number, dto: SubmitAnswerDto): Promise<{
        ok: boolean;
        answerId: number;
    }>;
    joinQuiz(studentId: number, joinCode: string): Promise<{
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
