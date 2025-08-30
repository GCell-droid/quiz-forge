/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please Provide Email' })
  email: string;
  @IsNotEmpty({ message: 'Please Provide Password' })
  password: string;
}
