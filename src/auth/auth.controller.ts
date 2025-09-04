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
import { GoogleAuthGuard } from './guards/google-auth/google-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import type { Request, Response } from 'express';
import { jwtAuthGuard } from './guards/jwtguard/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @UseGuards(jwtAuthGuard)
  @Get('/test')
  serverTest() {
    return 'Server Running ';
  }
  @UseGuards(GoogleAuthGuard)
  @Get('/google')
  googleSignIn() {}

  @UseGuards(GoogleAuthGuard)
  @Get('/google/callback')
  googleCallback() {}

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
}
