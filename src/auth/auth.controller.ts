import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth/google-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import { JwtOrGoogleAuthGuard } from './guards/combinedGuard/combined-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @UseGuards(JwtOrGoogleAuthGuard)
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
  login(@Body() logindto: LoginDto) {
    return this.authService.login(logindto);
  }
  @Post('register')
  register(@Body() registerdto: RegisterDTO) {
    return this.authService.register(registerdto);
  }
}
