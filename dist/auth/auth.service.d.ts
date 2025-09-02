import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from './entity/user.entity';
import { ConfigService } from '@nestjs/config';
import { RegisterDTO } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleRegisterDTO } from './dto/googleregistration.dto';
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
            createdAt: Date;
        };
        message: string;
    }>;
    private hashPassword;
    login(logindto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: number;
            email: string;
            name: string;
            role: UserRole;
            createdAt: Date;
        };
    }>;
    verifyPassword(password: string, dbpassword: string): Promise<boolean>;
    private generateToken;
    private generateAccessToken;
    private generateRefreshToken;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
    }>;
    validateGoogleUser(googleUser: GoogleRegisterDTO, role?: UserRole): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: number;
            email: string;
            name: string;
            role: UserRole;
            createdAt: Date;
        };
        needsRole?: undefined;
        email?: undefined;
    } | {
        needsRole: boolean;
        email: string;
    }>;
    getUserById(Userid: number): Promise<{
        id: number;
        email: string;
        name: string;
        role: UserRole;
        createdAt: Date;
    }>;
}
