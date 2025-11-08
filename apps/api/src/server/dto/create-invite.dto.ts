import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInviteDto {
  @ApiProperty({
    description: 'Maximum number of uses (0 = unlimited)',
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUses?: number = 0;

  @ApiProperty({
    description: 'Expires in days (0 = never)',
    required: false,
    default: 7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  expiresInDays?: number = 7;
}

