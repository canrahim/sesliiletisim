import { IsString, IsEnum, IsOptional, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { UserRole } from '@prisma/client';

// Use Prisma's UserRole enum
export { UserRole as ServerRole } from '@prisma/client';

export class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

export class UpdateMemberRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

export class CreateInviteDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUses?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(8760) // 1 year in hours
  expiresIn?: number = 168; // 7 days default
}
