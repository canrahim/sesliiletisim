import { IsString, IsEnum, IsOptional, MinLength, MaxLength, IsBoolean } from 'class-validator';

export enum ChannelType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  VIDEO = 'VIDEO',
}

export class CreateChannelDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEnum(ChannelType)
  type: ChannelType;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}

export class UpdateChannelDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}

export class ChannelDto {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  serverId: string;
  position: number;
  maxUsers?: number;
  createdAt: Date;
  updatedAt: Date;
}
