import { AuthController } from './auth.controller';
import { UserRole } from '../common/enums/enum';

describe('AuthController', () => {
  it('delegates registration to the auth service', () => {
    const register = jest.fn().mockReturnValue({ message: 'created' });
    const controller = new AuthController({ register } as never, {} as never);
    const dto = {
      email: 'new@example.com',
      name: 'New',
      password: 'StrongPassword123!',
      role: UserRole.STUDENT,
    };
    const response = {} as never;

    expect(controller.register(dto, response)).toEqual({ message: 'created' });
    expect(register).toHaveBeenCalledWith(dto, response);
  });
});
