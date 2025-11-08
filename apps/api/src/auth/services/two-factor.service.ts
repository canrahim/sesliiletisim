import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface Enable2FAResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface Verify2FAResponse {
  success: boolean;
  backupCodeUsed?: boolean;
}

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly appName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.appName = this.configService.get('APP_NAME', 'AsforceS Voice');
    
    // Configure otplib
    authenticator.options = {
      window: 1, // Allow 1 step before/after current time window
    };
  }

  /**
   * Generate 2FA secret and QR code
   */
  async generate2FA(userId: string, email: string): Promise<Enable2FAResponse> {
    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate OTP Auth URL
    const otpAuthUrl = authenticator.keyuri(email, this.appName, secret);

    // Generate QR Code
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

    // Check if 2FA already exists
    const existing2FA = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (existing2FA) {
      // Update existing 2FA
      await this.prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          secret,
          backupCodes: hashedBackupCodes,
          isEnabled: false, // Will be enabled after verification
        },
      });
    } else {
      // Create new 2FA
      await this.prisma.twoFactorAuth.create({
        data: {
          userId,
          secret,
          backupCodes: hashedBackupCodes,
          isEnabled: false,
        },
      });
    }

    this.logger.log(`2FA generated for user: ${userId}`);

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Enable 2FA after verification
   */
  async enable2FA(userId: string, code: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new BadRequestException('2FA not set up');
    }

    // Verify the code
    const isValid = authenticator.verify({
      token: code,
      secret: twoFactorAuth.secret,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code');
    }

    // Enable 2FA
    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: true },
    });

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    this.logger.log(`2FA enabled for user: ${userId}`);

    return true;
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, code: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new BadRequestException('2FA not enabled');
    }

    // Verify the code or backup code
    const isValid = await this.verify2FA(userId, code);

    if (!isValid.success) {
      throw new BadRequestException('Invalid 2FA code');
    }

    // Disable 2FA
    await this.prisma.twoFactorAuth.delete({
      where: { userId },
    });

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    });

    this.logger.log(`2FA disabled for user: ${userId}`);

    return true;
  }

  /**
   * Verify 2FA code (TOTP or backup code)
   */
  async verify2FA(userId: string, code: string): Promise<Verify2FAResponse> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new BadRequestException('2FA not enabled');
    }

    // Remove whitespace and hyphens from code
    const cleanCode = code.replace(/[\s-]/g, '');

    // Try TOTP verification first
    const isTOTPValid = authenticator.verify({
      token: cleanCode,
      secret: twoFactorAuth.secret,
    });

    if (isTOTPValid) {
      return { success: true, backupCodeUsed: false };
    }

    // Try backup codes
    const isBackupCodeValid = await this.verifyBackupCode(userId, cleanCode);

    if (isBackupCodeValid) {
      return { success: true, backupCodeUsed: true };
    }

    return { success: false };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      throw new BadRequestException('2FA not enabled');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

    // Update backup codes
    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { backupCodes: hashedBackupCodes },
    });

    this.logger.log(`Backup codes regenerated for user: ${userId}`);

    return backupCodes;
  }

  /**
   * Get 2FA status for a user
   */
  async get2FAStatus(userId: string) {
    return this.prisma.twoFactorAuth.findUnique({
      where: { userId },
      select: {
        isEnabled: true,
        backupCodes: true,
      },
    });
  }

  /**
   * Generate backup codes (8 codes, 10 characters each)
   */
  private generateBackupCodes(count: number = 8): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate random bytes and convert to base36 (alphanumeric)
      const code = randomBytes(8)
        .toString('hex')
        .substring(0, 10)
        .toUpperCase();
      
      // Format as XXXXX-XXXXX
      const formattedCode = `${code.substring(0, 5)}-${code.substring(5, 10)}`;
      codes.push(formattedCode);
    }

    return codes;
  }

  /**
   * Hash backup codes with Argon2
   */
  private async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashedCodes = await Promise.all(
      codes.map(code => argon2.hash(code.replace('-', ''), {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      }))
    );

    return hashedCodes;
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const twoFactorAuth = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.backupCodes) {
      return false;
    }

    // Remove formatting from input code
    const cleanCode = code.replace('-', '');

    // Try each backup code
    for (let i = 0; i < twoFactorAuth.backupCodes.length; i++) {
      const hashedCode = twoFactorAuth.backupCodes[i];
      
      try {
        const isValid = await argon2.verify(hashedCode, cleanCode);
        
        if (isValid) {
          // Remove used backup code
          const remainingCodes = [
            ...twoFactorAuth.backupCodes.slice(0, i),
            ...twoFactorAuth.backupCodes.slice(i + 1),
          ];

          await this.prisma.twoFactorAuth.update({
            where: { userId },
            data: { backupCodes: remainingCodes },
          });

          this.logger.log(`Backup code used for user: ${userId}`);
          return true;
        }
      } catch {
        // Continue to next code
        continue;
      }
    }

    return false;
  }
}
