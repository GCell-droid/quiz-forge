import { Controller, Get, Req, UseGuards, Put, Body } from '@nestjs/common';
import { UpdateProfileDto, ChangePasswordDto } from './dto/user.dto';
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

  @UseGuards(jwtAuthGuard)
  @Put('profile')
  updateProfile(@Req() req, @Body() body: UpdateProfileDto) {
    return this.userService.updateProfile(String(req.user.userId), body);
  }

  @UseGuards(jwtAuthGuard)
  @Put('password')
  updatePassword(@Req() req, @Body() body: ChangePasswordDto) {
    return this.userService.updatePassword(String(req.user.userId), body);
  }
}
