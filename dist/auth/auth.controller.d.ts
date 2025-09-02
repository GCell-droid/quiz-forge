import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    serverTest(): string;
    googleSignIn(): void;
    googleCallback(): void;
    login(logindto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: number;
            email: string;
            name: string;
            role: import("./entity/user.entity").UserRole;
            createdAt: Date;
        };
    }>;
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
