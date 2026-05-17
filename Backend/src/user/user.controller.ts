import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { Request } from 'express';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @UseGuards(jwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req) {
    return this.userService.getProfile(String(req.user.userId));
  }
}
