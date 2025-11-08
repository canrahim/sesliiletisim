import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'johndoe',
    description: 'Username (3-20 characters, alphanumeric, underscore, dash)',
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(20, { message: 'Username must not exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and dashes',
  })
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'SecureP@ss123',
    description:
      'Password (min 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
  })
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Display name (optional)',
    required: false,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({
    example: '0.abc123def456...',
    description: 'Cloudflare Turnstile CAPTCHA token (required if CAPTCHA is enabled)',
  })
  @IsString()
  @IsOptional()
  captchaToken?: string;
}
