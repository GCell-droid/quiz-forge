import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  ValidateIf,
} from 'class-validator';
import { UserRole } from 'src/common/enums/enum'; // Assuming your enum is still here

export class RegisterDTO {
  @IsEmail({}, { message: 'Please Provide Email' })
  email: string;

  @IsNotEmpty({ message: 'Please Provide name' })
  @IsString({ message: 'name must be string' })
  name: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @ValidateIf((object) => !object.oauthProvider)
  @IsNotEmpty({ message: 'Please provide password' })
  @IsStrongPassword({}, { message: 'Please provide strong password' })
  password?: string;

  @IsEnum(UserRole, { message: "Role must be either 'teacher' or 'student'" })
  role: UserRole;

  @IsOptional()
  @IsString()
  oauthProvider?: string;

  @IsOptional()
  @IsString()
  oauthId?: string;
}
