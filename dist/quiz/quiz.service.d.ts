import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { UserEntity } from 'src/auth/entity/user.entity';
import { QuizEntity } from './entites/quiz.entity';
import { QuestionEntity } from './entites/question.entity';
import { QuizSessionEntity } from './entites/quizsession.entity';
import { ScheduleQuizDto } from './dto/schedule-quiz.dto';
import { CreateQuizDto } from './dto/create-quiz-dto';
export declare class QuizService {
    private quizRepo;
    private questionRepo;
    private sessionRepo;
    private userRepo;
    private schedulerRegistry;
    constructor(quizRepo: Repository<QuizEntity>, questionRepo: Repository<QuestionEntity>, sessionRepo: Repository<QuizSessionEntity>, userRepo: Repository<UserEntity>, schedulerRegistry: SchedulerRegistry);
    createQuiz(dto: CreateQuizDto, teacherId: number): Promise<QuizEntity>;
    scheduleQuiz(dto: ScheduleQuizDto, teacherId: number): Promise<QuizSessionEntity>;
    getQuiz(quizId: number): Promise<QuizEntity>;
    private addCronJob;
}
