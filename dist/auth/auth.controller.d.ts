import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserRole } from './entity/user.entity';
export declare class AuthController {
    private readonly authService;
    private readonly configService;
    constructor(authService: AuthService, configService: ConfigService);
    serverTest(): string;
    googleSignIn(): void;
    googleCallback(req: Request, res: Response): {
        needsRole: boolean;
        email: any;
        message?: undefined;
        user?: undefined;
    } | {
        message: string;
        user: any;
        needsRole?: undefined;
        email?: undefined;
    };
    login(logindto: LoginDto, request: Request, response: Response): Promise<{
        message: string;
        user: {
            id: number;
            email: string;
            name: string;
            role: UserRole;
            quizzes: import("../quiz/entites/quiz.entity").QuizEntity[];
            answers: import("../quiz/entites/answer.entity").AnswerEntity[];
            sessions: import("../quiz/entites/quizsession.entity").QuizSessionEntity[];
            createdAt: Date;
        };
    } | undefined>;
    register(registerdto: RegisterDTO): Promise<{
        user: {
            id: number;
            email: string;
            name: string;
            role: UserRole;
            quizzes: import("../quiz/entites/quiz.entity").QuizEntity[];
            answers: import("../quiz/entites/answer.entity").AnswerEntity[];
            sessions: import("../quiz/entites/quizsession.entity").QuizSessionEntity[];
            createdAt: Date;
        };
        message: string;
    }>;
    logout(res: Response): Response<any, Record<string, any>>;
}
