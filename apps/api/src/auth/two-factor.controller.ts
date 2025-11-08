import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { TwoFactorService } from './services/two-factor.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  Enable2FADto,
  Verify2FADto,
  Disable2FADto,
} from './dto/two-factor.dto';

@ApiTags('auth/2fa')
@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({
    status: 200,
    description: 'QR code and secret generated',
    schema: {
      type: 'object',
      properties: {
        secret: { type: 'string', description: 'TOTP secret for manual entry' },
        qrCodeUrl: { type: 'string', description: 'QR code data URL' },
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Backup recovery codes',
        },
      },
    },
  })
  async generate2FA(
    @CurrentUser('id') userId: string,
    @CurrentUser('email') email: string,
  ) {
    return this.twoFactorService.generate2FA(userId, email);
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'Enable 2FA after verification' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async enable2FA(
    @CurrentUser('id') userId: string,
    @Body() dto: Enable2FADto,
  ) {
    const success = await this.twoFactorService.enable2FA(userId, dto.code);
    if (success) {
      return { message: '2FA enabled successfully' };
    }
    throw new BadRequestException('Failed to enable 2FA');
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async disable2FA(
    @CurrentUser('id') userId: string,
    @Body() dto: Disable2FADto,
  ) {
    const success = await this.twoFactorService.disable2FA(userId, dto.code);
    if (success) {
      return { message: '2FA disabled successfully' };
    }
    throw new BadRequestException('Failed to disable 2FA');
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  @ApiOperation({ summary: 'Verify 2FA code (for testing)' })
  @ApiResponse({ status: 200, description: 'Code valid' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  async verify2FA(
    @CurrentUser('id') userId: string,
    @Body() dto: Verify2FADto,
  ) {
    const result = await this.twoFactorService.verify2FA(userId, dto.code);
    if (result.success) {
      return {
        message: 'Code valid',
        backupCodeUsed: result.backupCodeUsed,
      };
    }
    throw new BadRequestException('Invalid code');
  }

  @Post('regenerate-backup-codes')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 60000 } }) // 2 requests per minute
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({
    status: 200,
    description: 'Backup codes regenerated',
    schema: {
      type: 'object',
      properties: {
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
          description: 'New backup recovery codes',
        },
      },
    },
  })
  async regenerateBackupCodes(@CurrentUser('id') userId: string) {
    const backupCodes = await this.twoFactorService.regenerateBackupCodes(userId);
    return { backupCodes };
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get 2FA status for current user' })
  @ApiResponse({
    status: 200,
    description: '2FA status',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: '2FA enabled status' },
        backupCodesRemaining: { type: 'number', description: 'Number of unused backup codes' },
      },
    },
  })
  async get2FAStatus(@CurrentUser() user: any) {
    const twoFactorAuth = await this.twoFactorService.get2FAStatus(user.id);
    
    return {
      enabled: user.twoFactorEnabled || false,
      backupCodesRemaining: twoFactorAuth?.backupCodes?.length || 0,
    };
  }
}
