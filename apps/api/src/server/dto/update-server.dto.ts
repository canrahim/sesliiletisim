import { IsString, IsOptional, MinLength, MaxLength, IsUrl } from 'class-validator';

export class UpdateServerDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string; // Avatar URL (upload'dan dönen - relative URL olabilir)
}
