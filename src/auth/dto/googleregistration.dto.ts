import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleRegisterDTO {
  @IsEmail({}, { message: 'Please Provide Email' })
  email: string;
  @IsNotEmpty({ message: 'Please Provide name' })
  @IsString({ message: 'name must be string' })
  name: string;
  @IsOptional()
  password: string;
  @IsOptional()
  @IsNotEmpty()
  role: string;
}
