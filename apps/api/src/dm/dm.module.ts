import { Module } from '@nestjs/common';
import { DmService } from './dm.service';
import { DmController } from './dm.controller';
import { DmGateway } from './dm.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DmController],
  providers: [DmService, DmGateway],
  exports: [DmService, DmGateway],
})
export class DmModule {}





