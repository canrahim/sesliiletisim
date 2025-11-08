import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({
    description: '6-digit 2FA code from authenticator app',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^[0-9]{6}$/, {
    message: '2FA code must be 6 digits',
  })
  code: string;
}

export class Verify2FADto {
  @ApiProperty({
    description: '6-digit 2FA code or backup code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class Disable2FADto {
  @ApiProperty({
    description: '6-digit 2FA code or backup code to disable 2FA',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
