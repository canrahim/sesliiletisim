import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EmailTemplates } from './email-templates';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly fromEmail: string;
  private readonly isEmailEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly templates: EmailTemplates,
  ) {
    this.fromEmail = this.configService.get('EMAIL_FROM', 'AsforceS Voice <noreply@asforces.com>');
    this.isEmailEnabled = this.configService.get('NODE_ENV') !== 'test';

    if (this.isEmailEnabled) {
      this.initializeTransporter();
    }
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpPort = parseInt(this.configService.get('SMTP_PORT', '587'), 10);
    const smtpSecure = this.configService.get('SMTP_SECURE') === 'true';
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPassword = this.configService.get('SMTP_PASSWORD');

    if (!smtpHost || !smtpUser || !smtpPassword) {
      this.logger.warn('SMTP credentials not configured. Email sending will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error.message);
      } else {
        this.logger.log('SMTP connection established successfully');
      }
    });
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isEmailEnabled || !this.transporter) {
      this.logger.warn(`Email sending disabled. Would send to: ${options.to}`);
      this.logger.debug(`Subject: ${options.subject}`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email sent to ${options.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error.message);
      throw error;
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(
    email: string,
    username: string,
    token: string,
    lang: 'tr' | 'en' = 'tr',
  ): Promise<boolean> {
    const verificationUrl = `${this.configService.get('WEB_APP_URL', 'http://localhost:3000')}/auth/verify-email?token=${token}`;

    const { subject, html, text } = this.templates.getVerificationEmail(
      username,
      verificationUrl,
      lang,
    );

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    username: string,
    token: string,
    lang: 'tr' | 'en' = 'tr',
  ): Promise<boolean> {
    const resetUrl = `${this.configService.get('WEB_APP_URL', 'http://localhost:3000')}/auth/reset-password?token=${token}`;

    const { subject, html, text } = this.templates.getPasswordResetEmail(
      username,
      resetUrl,
      lang,
    );

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send 2FA setup email
   */
  async send2FASetupEmail(
    email: string,
    username: string,
    lang: 'tr' | 'en' = 'tr',
  ): Promise<boolean> {
    const { subject, html, text } = this.templates.get2FASetupEmail(username, lang);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send 2FA disabled email
   */
  async send2FADisabledEmail(
    email: string,
    username: string,
    lang: 'tr' | 'en' = 'tr',
  ): Promise<boolean> {
    const { subject, html, text } = this.templates.get2FADisabledEmail(username, lang);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    email: string,
    username: string,
    lang: 'tr' | 'en' = 'tr',
  ): Promise<boolean> {
    const { subject, html, text } = this.templates.getWelcomeEmail(username, lang);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }
}
