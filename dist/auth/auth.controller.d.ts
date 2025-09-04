import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import type { Request, Response } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    serverTest(): string;
    googleSignIn(): void;
    googleCallback(): void;
    login(logindto: LoginDto, request: Request, response: Response): Promise<{
        message: string;
        user: {
            id: number;
            email: string;
            name: string;
            role: import("./entity/user.entity").UserRole;
            createdAt: Date;
        };
    } | undefined>;
    register(registerdto: RegisterDTO): Promise<{
        user: {
            id: number;
            email: string;
            name: string;
            role: import("./entity/user.entity").UserRole;
            createdAt: Date;
        };
        message: string;
    }>;
}
