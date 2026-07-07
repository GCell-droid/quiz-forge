import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import User from 'src/common/entity/user.entity';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { UpdateProfileDto, ChangePasswordDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { uid: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      oauthProvider: user.oauthProvider,
      oauthId: user.oauthId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { uid: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.name = dto.name;
    const savedUser = await this.userRepository.save(user);

    const { passwordHash, ...result } = savedUser;
    return result;
  }

  async updatePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { uid: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Google OAuth users don't have a traditional password
    if (user.oauthProvider === 'google' || !user.passwordHash) {
      throw new BadRequestException('Cannot change password for OAuth accounts.');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid current password.');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    user.passwordHash = hashedNewPassword;
    await this.userRepository.save(user);

    return { message: 'Password updated successfully' };
  }
}
