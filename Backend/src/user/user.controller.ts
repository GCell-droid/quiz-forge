import { Controller, Get, Req, UseGuards, Put, Patch, Body } from '@nestjs/common';
import { UpdateProfileDto, ChangePasswordDto } from './dto/user.dto';
import { UserService } from './user.service';
import { jwtAuthGuard } from 'src/auth/guards/jwtguard/jwt-auth.guard';
import { Request } from 'express';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @UseGuards(jwtAuthGuard)
  @Get('me')
  getProfile(@Req() req) {
    return this.userService.getProfile(String(req.user.userId));
  }

  @UseGuards(jwtAuthGuard)
  @Patch('me')
  updateProfile(@Req() req, @Body() body: UpdateProfileDto) {
    return this.userService.updateProfile(String(req.user.userId), body);
  }

  @UseGuards(jwtAuthGuard)
  @Put('me/password')
  updatePassword(@Req() req, @Body() body: ChangePasswordDto) {
    return this.userService.updatePassword(String(req.user.userId), body);
  }
}
