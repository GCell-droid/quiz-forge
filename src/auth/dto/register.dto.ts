import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class RegisterDTO {
  @IsEmail({}, { message: 'Please Provide Email' })
  email: string;
  @IsNotEmpty({ message: 'Please Provide name' })
  @IsString({ message: 'name must be string' })
  name: string;
  @IsNotEmpty({ message: 'Please provide password' })
  @IsStrongPassword({}, { message: 'Please provide strong password' })
  password: string;
  @IsNotEmpty()
  role: string;
}
