"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./entity/user.entity");
const typeorm_2 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const bcrypt_1 = __importDefault(require("bcrypt"));
let AuthService = class AuthService {
    userRepository;
    jwtService;
    configService;
    constructor(userRepository, jwtService, configService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async register(registerdto) {
        const existingUser = await this.userRepository.findOne({
            where: { email: registerdto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException("Can't Register the User. Conflicting Email!");
        }
        const hashedPassword = await this.hashPassword(registerdto.password);
        const newUser = this.userRepository.create({
            name: registerdto.name,
            email: registerdto.email,
            password: hashedPassword,
            role: registerdto.role,
        });
        const savedUser = await this.userRepository.save(newUser);
        const { password, ...result } = savedUser;
        return { user: result, message: 'User Registered Please Login' };
    }
    async hashPassword(password) {
        return await bcrypt_1.default.hash(password, 10);
    }
    async login(logindto, request, res) {
        try {
            const token = request?.signedCookies?.jwt;
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
            const user = await this.userRepository.findOne({
                where: { id: payload.sub },
            });
            if (user) {
                const { password, ...result } = user;
                return {
                    message: 'Already logged',
                    user: result,
                };
            }
        }
        catch (err) {
            const user = await this.userRepository.findOne({
                where: { email: logindto.email },
            });
            if (!user ||
                !(await this.verifyPassword(logindto.password, user.password))) {
                throw new common_1.UnauthorizedException('Invalid Credentials');
            }
            const tokens = this.generateToken(user);
            const { password, ...result } = user;
            this.setAuthCookies(tokens, res);
            return {
                message: 'Login Sucess',
                user: result,
            };
        }
    }
    async verifyPassword(password, dbpassword) {
        return await bcrypt_1.default.compare(password, dbpassword);
    }
    generateToken(user) {
        return {
            accessToken: this.generateAccessToken(user),
            refreshToken: this.generateRefreshToken(user),
        };
    }
    generateAccessToken(user) {
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
        };
        const jwtSecret = this.configService.get('JWT_SECRET');
        return this.jwtService.sign(payload, {
            secret: jwtSecret,
            expiresIn: '15m',
        });
    }
    generateRefreshToken(user) {
        const payload = {
            sub: user.id,
        };
        const jwtSecret = this.configService.get('JWT_SECRET');
        return this.jwtService.sign(payload, {
            secret: jwtSecret,
            expiresIn: '7d',
        });
    }
    async refreshToken(refreshToken) {
        try {
            const jwtSecret = this.configService.get('JWT_SECRET');
            const payload = this.jwtService.verify(refreshToken, {
                secret: jwtSecret,
            });
            if (!payload || !payload?.sub) {
                throw new common_1.UnauthorizedException('Invalid Token');
            }
            const user = await this.userRepository.findOne({
                where: { id: payload.sub },
            });
            if (!user)
                throw new common_1.UnauthorizedException('Invalid Token');
            const accessToken = this.generateAccessToken(user);
            return { accessToken };
        }
        catch (e) {
            throw new common_1.UnauthorizedException('Invalid Token');
        }
    }
    async validateGoogleUser(googleUser, role) {
        const existingUser = await this.userRepository.findOne({
            where: { email: googleUser.email },
        });
        if (existingUser) {
            const { password, ...result } = existingUser;
            const tokens = this.generateToken(existingUser);
            return { user: result, tokens };
        }
        if (!role) {
            return { needsRole: true, email: googleUser.email };
        }
        const newUser = this.userRepository.create({
            name: googleUser.name,
            email: googleUser.email,
            password: '',
            role,
        });
        const savedUser = await this.userRepository.save(newUser);
        const { password, ...result } = savedUser;
        const tokens = this.generateToken(savedUser);
        return { user: result, tokens };
    }
    async getUserById(Userid) {
        const user = await this.userRepository.findOne({ where: { id: Userid } });
        if (!user) {
            throw new Error('User not found');
        }
        const { password, ...result } = user;
        return result;
    }
    setAuthCookies(tokens, res) {
        res.cookie('jwt', tokens.accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000,
            signed: true,
        });
        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            signed: true,
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_2.InjectRepository)(user_entity_1.UserEntity)),
    __metadata("design:paramtypes", [typeorm_1.Repository,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map