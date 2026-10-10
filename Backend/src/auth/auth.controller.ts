/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDTO } from './dto/register.dto';
import type { Request, Response } from 'express';
import { jwtAuthGuard } from './guards/jwtguard/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/common/enums/enum';
import { AuthGuard } from '@nestjs/passport';
import LoginDto from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(AuthGuard('google'))
  @Get('/google')
  googleSignIn() {}
  @UseGuards(AuthGuard('google'))
  @Get('/google/callback')
  googleCallback(@Req() req: Request, @Res() res: Response) {
    const { tokens, needsRole, message } = req.user as any;
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    if (tokens) {
      this.authService.setAuthCookies(tokens, res);
    }
    if (needsRole) {
      return res.redirect(`${frontendUrl}/profile/edit`);
    }
    return res.redirect(`${frontendUrl}/dashboard`);
  }

  @Post('sessions')
  login(
    @Body() logindto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(logindto, request, response);
  }

  @Post('accounts')
  register(
    @Body() registerdto: RegisterDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(registerdto, res);
  }

  @UseGuards(jwtAuthGuard)
  @Delete('sessions/current')
  logout(@Res({ passthrough: true }) res: Response) {
    this.authService.logout(res);
    return { message: 'Logged out successfully' };
  }

  @Post('tokens')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // The refresh_token cookie is signed, so we access it via signedCookies
    const refreshToken = req.signedCookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    return this.authService.refreshToken(refreshToken, res);
  }

  @UseGuards(jwtAuthGuard)
  @Get('sessions/current')
  me(@Res({ passthrough: true }) res: Response) {
    return { message: 'You are logged In' };
  }

  @UseGuards(jwtAuthGuard)
  @Patch('accounts/me/role')
  updateRole(
    @Body('role') role: UserRole,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = (req.user as any).userId;
    return this.authService.updateRole(userId, role, res);
  }
}
