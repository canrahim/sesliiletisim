import { Module } from '@nestjs/common';
import { ServerService } from './server.service';
import { ServerController } from './server.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [PrismaModule, PresenceModule],
  controllers: [ServerController],
  providers: [ServerService],
  exports: [ServerService],
})
export class ServerModule {}
