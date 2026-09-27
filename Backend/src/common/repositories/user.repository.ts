import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import User from '../entity/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findById(uid: string): Promise<User | null> {
    return this.users.findOne({ where: { uid } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  create(data: Partial<User>): User {
    return this.users.create(data);
  }

  save(user: User): Promise<User> {
    return this.users.save(user);
  }
}
