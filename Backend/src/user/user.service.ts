import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import User from 'src/common/entity/user.entity';
import { Repository } from 'typeorm';

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
}
