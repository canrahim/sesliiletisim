import { IsString, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
import { ChannelType } from '@prisma/client';

export class CreateChannelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(ChannelType)
  @IsOptional()
  type?: ChannelType = ChannelType.TEXT;

  @IsString()
  @IsOptional()
  serverId?: string;
}
