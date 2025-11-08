import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_OPTIONS',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD'),
        db: configService.get('REDIS_DB', 0),
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
      }),
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
