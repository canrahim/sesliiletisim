import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { HealthModule } from './health/health.module';
import { ServerModule } from './server/server.module';
import { ChannelModule } from './channel/channel.module';
import { MessageModule } from './message/message.module';
import { VoiceModule } from './voice/voice.module';
import { RtcModule } from './rtc/rtc.module';
import { PresenceModule } from './presence/presence.module';
import { FriendModule } from './friend/friend.module';
import { DmModule } from './dm/dm.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
    ]),

    // Scheduling
    ScheduleModule.forRoot(),

    // Database
    PrismaModule,

    // Cache & Session
    RedisModule,

    // Common Services (Global)
    CommonModule,

    // Feature Modules
    AuthModule,
    UserModule,
    HealthModule,
    ServerModule,
    ChannelModule,
    MessageModule,
    VoiceModule,
    RtcModule,
    PresenceModule,
    FriendModule,
    DmModule,
    UploadModule,
  ],
})
export class AppModule {}
