import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService registration', () => {
  it('rejects an email already present without creating another user', async () => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue({ uid: 'existing-user' }),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new AuthService(users as never, {} as never, {} as never);

    await expect(
      service.register(
        {
          email: 'known@example.com',
          name: 'Known',
          password: 'StrongPassword123!',
          role: 'student' as never,
        },
        {} as never,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(users.create).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
  });
});
