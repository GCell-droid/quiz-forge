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
import { RegisterDTO } from './dto/register.dto';
import type { Request, Response } from 'express';
import { jwtAuthGuard } from './guards/jwtguard/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { Roles } from './decorators/roles.decorator';
import { RoleGuard } from './guards/roles-guard/roles.guard';
import { UserRole } from 'src/common/enums/enum';
import { AuthGuard } from '@nestjs/passport';
import LoginDto from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Roles(UserRole.TEACHER)
  @UseGuards(jwtAuthGuard, RoleGuard)
  @Get('/test')
  serverTest() {
    return 'Server Running ';
  }

  @UseGuards(AuthGuard('google'))
  @Get('/google')
  googleSignIn() {}
  @UseGuards(AuthGuard('google'))
  @Get('/google/callback')
  googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, needsRole, message } = req.user as any;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (tokens) {
      this.authService.setAuthCookies(tokens, res);
    }
    if (needsRole) {
      return res.redirect(`${frontendUrl}/profile/edit`);
    }
    return res.redirect(`${frontendUrl}/dashboard`);
  }

  @Post('/login')
  login(
    @Body() logindto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(logindto, request, response);
  }

  @Post('/register')
  register(@Body() registerdto: RegisterDTO) {
    return this.authService.register(registerdto);
  }

  @UseGuards(jwtAuthGuard)
  @Post('/logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.authService.logout(res);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(jwtAuthGuard)
  @Get('/me')
  me(@Res({ passthrough: true }) res: Response) {
    return { message: 'You are logged In' };
  }
}
