import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-here',
    description: 'Password reset token',
  })
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'NewSecureP@ss123',
    description: 'New password',
  })
  @IsNotEmpty()
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    example: 'verification-token-here',
    description: 'Email verification token',
  })
  @IsNotEmpty()
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldP@ss123',
    description: 'Current password',
  })
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    example: 'NewSecureP@ss123',
    description: 'New password',
  })
  @IsNotEmpty()
  newPassword: string;
}
