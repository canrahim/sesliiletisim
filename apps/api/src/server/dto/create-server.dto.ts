import { IsString, IsOptional, MinLength, MaxLength, IsUrl, IsArray } from 'class-validator';

export class CreateServerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultChannels?: string[];
}
