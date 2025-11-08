import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly secretKey: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY') || '';
    this.enabled = this.configService.get<boolean>('CAPTCHA_ENABLED', false);

    if (this.enabled && !this.secretKey) {
      this.logger.warn(
        'CAPTCHA is enabled but TURNSTILE_SECRET_KEY is not set. CAPTCHA verification will fail.',
      );
    }
  }

  /**
   * Verify Cloudflare Turnstile CAPTCHA token
   */
  async verifyToken(token: string, remoteIp?: string): Promise<boolean> {
    // If CAPTCHA is disabled, always return true
    if (!this.enabled) {
      this.logger.debug('CAPTCHA verification skipped (disabled)');
      return true;
    }

    if (!token) {
      throw new BadRequestException('CAPTCHA token is required');
    }

    if (!this.secretKey) {
      this.logger.error('TURNSTILE_SECRET_KEY is not configured');
      throw new BadRequestException('CAPTCHA verification is not properly configured');
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', this.secretKey);
      formData.append('response', token);
      if (remoteIp) {
        formData.append('remoteip', remoteIp);
      }

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        },
      );

      if (!response.ok) {
        this.logger.error(`Turnstile API returned status ${response.status}`);
        throw new BadRequestException('CAPTCHA verification failed');
      }

      const data: TurnstileVerifyResponse = await response.json();

      if (!data.success) {
        this.logger.warn(
          `CAPTCHA verification failed: ${data['error-codes']?.join(', ')}`,
        );
        return false;
      }

      this.logger.debug('CAPTCHA verification successful');
      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`CAPTCHA verification error: ${error.message}`);
      throw new BadRequestException('CAPTCHA verification failed');
    }
  }

  /**
   * Check if CAPTCHA is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}


