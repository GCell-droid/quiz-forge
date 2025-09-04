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
import { UserEntity, UserRole } from './entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RegisterDTO } from './dto/register.dto';
import bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { GoogleRegisterDTO } from './dto/googleregistration.dto';
import type { Request, Response } from 'express';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  async register(registerdto: RegisterDTO) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerdto.email },
    });
    if (existingUser) {
      throw new ConflictException(
        "Can't Register the User. Conflicting Email!",
      );
    }
    const hashedPassword = await this.hashPassword(registerdto.password);
    const newUser = this.userRepository.create({
      name: registerdto.name,
      email: registerdto.email,
      password: hashedPassword,
      role: registerdto.role as UserRole,
    });
    const savedUser = await this.userRepository.save(newUser);
    const { password, ...result } = savedUser;
    return { user: result, message: 'User Registered Please Login' };
  }
  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }
  async login(logindto: LoginDto, request: Request, res: Response) {
    try {
      const token = request?.signedCookies?.jwt;
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
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
    } catch (err) {
      const user = await this.userRepository.findOne({
        where: { email: logindto.email },
      });
      if (
        !user ||
        !(await this.verifyPassword(logindto.password, user.password))
      ) {
        throw new UnauthorizedException('Invalid Credentials');
      }
      //generate tokens
      const tokens = this.generateToken(user);
      const { password, ...result } = user;
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
  private generateToken(user: UserEntity) {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }
  private generateAccessToken(user: UserEntity): string {
    //token will have : email, sub(id), role ->for role based authentication
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    return this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '15m',
    });
  }
  private generateRefreshToken(user: UserEntity): string {
    const payload = {
      sub: user.id,
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
        where: { id: payload.sub },
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
      const { password, ...result } = existingUser;
      const tokens = this.generateToken(existingUser);
      return { user: result, tokens };
    }

    if (!role) {
      // return a consistent object
      return { needsRole: true, email: googleUser.email };
    }

    // Save new user with selected role
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

  async getUserById(Userid: number) {
    const user = await this.userRepository.findOne({ where: { id: Userid } });
    if (!user) {
      throw new Error('User not found');
    }
    const { password, ...result } = user;
    return result;
  }

  private setAuthCookies(
    tokens: { accessToken: string; refreshToken: string },
    res: Response,
  ) {
    res.cookie('jwt', tokens.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
      signed: true,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      signed: true,
    });
  }
}
