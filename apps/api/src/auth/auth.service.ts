import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import { CaptchaService } from '../common/services/captcha.service';
import { TwoFactorService } from './services/two-factor.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly captchaService: CaptchaService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  /**
   * Register a new user
   */
  async register(dto: RegisterDto) {
    // Verify CAPTCHA if enabled and token provided
    if (dto.captchaToken && this.captchaService?.isEnabled()) {
      const isValidCaptcha = await this.captchaService.verifyToken(dto.captchaToken);
      if (!isValidCaptcha) {
        throw new BadRequestException('CAPTCHA verification failed');
      }
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('Email already registered');
      }
      if (existingUser.username === dto.username) {
        throw new ConflictException('Username already taken');
      }
    }

    // Hash password with Argon2id
    const hashedPassword = await this.hashPassword(dto.password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        displayName: dto.displayName || dto.username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        createdAt: true,
      },
    });

    // Create email verification token
    const verificationToken = await this.createEmailVerificationToken(user.id, user.email);

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.username,
        verificationToken.token,
      );
      this.logger.log(`User registered: ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
      this.logger.debug(`Verification token: ${verificationToken.token}`);
    }

    return {
      user,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  /**
   * Login user
   */
  async login(dto: LoginDto, req: any) {
    // Find user by email or username
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
      },
      include: {
        twoFactorAuth: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(user.password, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Check if email is verified (optional for development)
    // if (!user.emailVerified) {
    //   throw new UnauthorizedException('Please verify your email first');
    // }

    // Check 2FA (optional - only if user has it enabled and provides code)
    if (user.twoFactorEnabled && user.twoFactorAuth?.isEnabled && dto.twoFactorCode) {
      const is2FAValid = await this.verify2FA(user.id, dto.twoFactorCode);
      if (!is2FAValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    // Create session
    const session = await this.createSession(user.id, req);

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user.id, session.id);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      },
      accessToken,
      refreshToken,
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    };
  }

  /**
   * Logout user
   */
  async logout(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { isValid: false },
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });

      // Check if session is valid
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: { user: true },
      });

      if (!session || !session.isValid || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid session');
      }

      // Generate new access token
      const { accessToken } = await this.generateTokens(session.userId, session.id);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string) {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verification.isUsed) {
      throw new BadRequestException('Token already used');
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Token expired');
    }

    // Update user
    await this.prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true },
    });

    // Mark token as used
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { isUsed: true, usedAt: new Date() },
    });

    this.logger.log(`Email verified: ${verification.user.email}`);

    return { message: 'Email verified successfully' };
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If your email is registered, you will receive a password reset link' };
    }

    // Create reset token
    const resetToken = await this.createPasswordResetToken(user.id);

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.username,
        resetToken.token,
      );
      this.logger.log(`Password reset requested: ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      this.logger.debug(`Reset token: ${resetToken.token}`);
    }

    return { message: 'If your email is registered, you will receive a password reset link' };
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!reset) {
      throw new BadRequestException('Invalid reset token');
    }

    if (reset.isUsed) {
      throw new BadRequestException('Token already used');
    }

    if (reset.expiresAt < new Date()) {
      throw new BadRequestException('Token expired');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update user password
    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await this.prisma.passwordReset.update({
      where: { id: reset.id },
      data: { isUsed: true, usedAt: new Date() },
    });

    // Invalidate all sessions
    await this.prisma.session.updateMany({
      where: { userId: reset.userId },
      data: { isValid: false },
    });

    this.logger.log(`Password reset: ${reset.user.email}`);

    return { message: 'Password reset successfully' };
  }

  /**
   * Helper: Hash password with Argon2id
   */
  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: parseInt(this.configService.get('ARGON2_MEMORY', '65536'), 10),
      timeCost: parseInt(this.configService.get('ARGON2_ITERATIONS', '3'), 10),
      parallelism: parseInt(this.configService.get('ARGON2_PARALLELISM', '4'), 10),
    });
  }

  /**
   * Helper: Verify password
   */
  private async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Helper: Generate JWT tokens
   */
  private async generateTokens(userId: string, sessionId: string) {
    const payload = { sub: userId, sessionId };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRES_IN', '30d'),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Helper: Create session
   */
  private async createSession(userId: string, req: any) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return this.prisma.session.create({
      data: {
        userId,
        token,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        expiresAt,
      },
    });
  }

  /**
   * Helper: Create email verification token
   */
  private async createEmailVerificationToken(userId: string, email: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return this.prisma.emailVerification.create({
      data: {
        userId,
        token,
        email,
        expiresAt,
      },
    });
  }

  /**
   * Helper: Create password reset token
   */
  private async createPasswordResetToken(userId: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    return this.prisma.passwordReset.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  /**
   * Resend email verification
   */
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If your email is registered, you will receive a verification email' };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Check for existing pending verification
    const existingVerification = await this.prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    let verificationToken;

    if (existingVerification) {
      // Use existing token if still valid
      verificationToken = existingVerification;
    } else {
      // Create new verification token
      verificationToken = await this.createEmailVerificationToken(user.id, user.email);
    }

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        user.username,
        verificationToken.token,
      );
      this.logger.log(`Verification email resent: ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to resend verification email: ${error.message}`);
      this.logger.debug(`Verification token: ${verificationToken.token}`);
    }

    return { message: 'If your email is registered, you will receive a verification email' };
  }

  /**
   * Helper: Verify 2FA code
   */
  private async verify2FA(userId: string, code: string): Promise<boolean> {
    try {
      const result = await this.twoFactorService.verify2FA(userId, code);
      return result.success;
    } catch (error) {
      this.logger.error(`2FA verification failed: ${error.message}`);
      return false;
    }
  }
}
