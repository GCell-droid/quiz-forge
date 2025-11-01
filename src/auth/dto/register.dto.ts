import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { UserRole } from '../entity/user.entity';

export class RegisterDTO {
  @IsEmail({}, { message: 'Please Provide Email' })
  email: string;
  @IsNotEmpty({ message: 'Please Provide name' })
  @IsString({ message: 'name must be string' })
  name: string;
  @IsNotEmpty({ message: 'Please provide password' })
  @IsStrongPassword({}, { message: 'Please provide strong password' })
  password: string;
  @IsEnum(UserRole, { message: "Role must be either 'teacher' or 'student'" })
  role: UserRole;
}
