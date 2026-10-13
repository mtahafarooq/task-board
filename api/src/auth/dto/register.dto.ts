import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 1, maxLength: 100, example: 'Ada Lovelace' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ minLength: 8, maxLength: 72, example: 'supersecret' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
