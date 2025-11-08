import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email or username',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string; // Can be email or username

  @ApiProperty({
    example: 'SecureP@ss123',
    description: 'Password',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: '123456',
    description: '2FA code (if enabled)',
    required: false,
  })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}
