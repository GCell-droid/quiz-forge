import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from './entity/user.entity';
import { ConfigService } from '@nestjs/config';
import { RegisterDTO } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleRegisterDTO } from './dto/googleregistration.dto';
import type { Request, Response } from 'express';
export declare class AuthService {
    private readonly userRepository;
    private jwtService;
    private readonly configService;
    constructor(userRepository: Repository<UserEntity>, jwtService: JwtService, configService: ConfigService);
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
    private hashPassword;
    login(logindto: LoginDto, request: Request, res: Response): Promise<{
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
    verifyPassword(password: string, dbpassword: string): Promise<boolean>;
    private generateToken;
    private generateAccessToken;
    private generateRefreshToken;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    validateGoogleUser(googleUser: GoogleRegisterDTO, role?: UserRole): Promise<{
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
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
        needsRole?: undefined;
        email?: undefined;
    } | {
        needsRole: boolean;
        email: string;
        user?: undefined;
        tokens?: undefined;
    }>;
    getUserById(Userid: number): Promise<{
        id: number;
        email: string;
        name: string;
        role: UserRole;
        quizzes: import("../quiz/entites/quiz.entity").QuizEntity[];
        answers: import("../quiz/entites/answer.entity").AnswerEntity[];
        sessions: import("../quiz/entites/quizsession.entity").QuizSessionEntity[];
        createdAt: Date;
    }>;
    private setAuthCookies;
}
