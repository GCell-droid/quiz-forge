import { IsEmail, IsNotEmpty } from 'class-validator';

export default class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  password: string;
}
