/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RegisterDTO } from './dto/register.dto';
import bcrypt from 'bcrypt';
import { GoogleRegisterDTO } from './dto/googleregistration.dto';
import type { Request, Response } from 'express';
import { UserRole } from 'src/common/enums/enum';
import User from 'src/common/entity/user.entity';
import LoginDto from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerdto: RegisterDTO) {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { email: registerdto.email },
      });
      if (existingUser) {
        throw new ConflictException(
          "Can't Register the User. Conflicting Email!",
        );
      }
      const hashedPassword = await this.hashPassword(registerdto.password!);

      const newUser = this.userRepository.create({
        name: registerdto.name,
        email: registerdto.email,
        passwordHash: hashedPassword,
        role: registerdto.role,
      });
      const savedUser = await this.userRepository.save(newUser);

      const { passwordHash, ...result } = savedUser;
      const tokens = this.generateToken(savedUser);
      return {
        user: result,
        needsRole: false,
        messsage: 'Registration Successfull',
      };
    } catch (err) {
      throw new ConflictException('Registration failed');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  async login(logindto: LoginDto, request: Request, res: Response) {
    try {
      const token = request?.signedCookies?.jwt;

      if (token) {
        const payload = this.jwtService.verify(token as string, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
        const user = await this.userRepository.findOne({
          where: { uid: payload.sub as string },
        });

        if (user) {
          const { passwordHash, ...result } = user;
          return {
            message: 'Already logged',
          };
        }
      }
      throw new Error('No valid session');
    } catch (err) {
      const user = await this.userRepository.findOne({
        where: { email: logindto.email },
      });

      if (
        !user ||
        !user.passwordHash ||
        !(await this.verifyPassword(logindto.password, user.passwordHash))
      ) {
        throw new UnauthorizedException('Invalid Credentials');
      }
      const tokens = this.generateToken(user);
      const { passwordHash, ...result } = user;
      this.setAuthCookies(tokens, res);
      return {
        message: 'Login Sucess',
        user: result,
      };
    }
  }

  async verifyPassword(password: string, dbpassword: string): Promise<boolean> {
    return await bcrypt.compare(password, dbpassword);
  }

  private generateToken(user: User) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  private generateAccessToken(user: User): string {
    const payload = {
      email: user.email,
      sub: user.uid,
      role: user.role,
    };
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    return this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '15m',
    });
  }

  private generateRefreshToken(user: User): string {
    const payload = {
      sub: user.uid,
    };
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    return this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '7d',
    });
  }

  async refreshToken(refreshToken: string) {
    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(refreshToken, {
        secret: jwtSecret as string,
      });

      if (!payload || !payload?.sub) {
        throw new UnauthorizedException('Invalid Token');
      }
      const user = await this.userRepository.findOne({
        where: { uid: payload.sub as any },
      });
      if (!user) throw new UnauthorizedException('Invalid Token');
      const accessToken = this.generateAccessToken(user);
      return { accessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid Token');
    }
  }

  async validateGoogleUser(googleUser: GoogleRegisterDTO, role?: UserRole) {
    const existingUser = await this.userRepository.findOne({
      where: { email: googleUser.email },
    });

    if (existingUser) {
      // Pre-Account Takeover Protection
      if (!existingUser.oauthProvider || existingUser.passwordHash !== '') {
        existingUser.passwordHash = '';
        existingUser.oauthProvider = 'google';
        await this.userRepository.save(existingUser);
      }

      const tokens = this.generateToken(existingUser);
      const { passwordHash, ...result } = existingUser;
      return { user: result, tokens };
    }

    const newUser = this.userRepository.create({
      name: googleUser.name,
      email: googleUser.email,
      passwordHash: '',
      role,
      oauthProvider: 'google',
    });

    const savedUser = await this.userRepository.save(newUser);

    const { passwordHash, ...result } = savedUser;
    const tokens = this.generateToken(savedUser);
    if (!role) {
      return { user: result, tokens, needsRole: true };
    }
    return {
      user: result,
      tokens,
      needsRole: false,
      messsage: 'Registration/Login from Google Successfull',
    };
  }

  async getUserById(Userid: number | string) {
    const user = await this.userRepository.findOne({
      where: { uid: Userid as any },
    });
    if (!user) {
      throw new Error('User not found');
    }
    const { passwordHash, ...result } = user;
    return result;
  }

  public setAuthCookies(
    tokens: { accessToken: string; refreshToken: string },
    res: Response,
  ) {
    res.cookie('jwt', tokens.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      signed: true,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      signed: true,
    });
  }

  public logout(res: Response) {
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
  }
}
