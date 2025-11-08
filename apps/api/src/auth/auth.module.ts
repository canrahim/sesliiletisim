import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { TwoFactorController } from './two-factor.controller';
import { AuthService } from './auth.service';
import { TwoFactorService } from './services/two-factor.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController, TwoFactorController],
  providers: [AuthService, TwoFactorService, JwtStrategy, JwtAuthGuard, RolesGuard, WsJwtGuard],
  exports: [AuthService, TwoFactorService, JwtAuthGuard, RolesGuard, WsJwtGuard, JwtModule],
})
export class AuthModule {}
