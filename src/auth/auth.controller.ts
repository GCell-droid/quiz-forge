/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import type { Request, Response } from 'express';
import { jwtAuthGuard } from './guards/jwtguard/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { GoogleOrJwtAuthGuard } from './guards/combinedGuard/combined-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from './entity/user.entity';
import { RoleGuard } from './guards/roles-guard/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}
  @Roles(UserRole.TEACHER) //set roles metadata that is required
  @UseGuards(jwtAuthGuard, RoleGuard)
  @Get('/test')
  serverTest() {
    return 'Server Running ';
  }
  @UseGuards(GoogleOrJwtAuthGuard)
  @Get('/google')
  googleSignIn() {}

  @UseGuards(GoogleOrJwtAuthGuard)
  @Get('/google/callback')
  googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens, needsRole, email } = req.user as any;

    if (needsRole) {
      return { needsRole: true, email };
    }
    // set cookies
    res.cookie('jwt', tokens?.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      signed: true,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      signed: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { message: 'Login successful', user };
  }

  @Post('login')
  login(
    @Body() logindto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(logindto, request, response);
  }

  @Post('register')
  register(@Body() registerdto: RegisterDTO) {
    return this.authService.register(registerdto);
  }
  @UseGuards(jwtAuthGuard)
  @Get('logout')
  logout(@Res() res: Response) {
    res.clearCookie('jwt');
    res.clearCookie('refresh_token');
    return res.send({ message: 'Logged out' });
  }
}
