import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DmService } from './dm.service';
import { DmGateway } from './dm.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('dm')
@Controller('dm')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DmController {
  constructor(
    private readonly dmService: DmService,
    private readonly dmGateway: DmGateway,
  ) {}

  @Post(':friendId')
  @ApiOperation({ summary: 'Send direct message to friend' })
  @ApiResponse({ status: 201, description: 'DM sent' })
  async sendDm(
    @CurrentUser('id') userId: string,
    @Param('friendId') friendId: string,
    @Body('content') content: string,
  ) {
    const dm = await this.dmService.sendDm(userId, friendId, content);
    
    // Emit via WebSocket
    this.dmGateway.emitNewDm(friendId, dm);
    
    return dm;
  }

  @Get(':friendId')
  @ApiOperation({ summary: 'Get DM conversation with friend' })
  @ApiResponse({ status: 200, description: 'DM conversation' })
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('friendId') friendId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.dmService.getConversation(userId, friendId, limitNum);
  }

  @Post(':dmId/read')
  @ApiOperation({ summary: 'Mark DM as read' })
  @ApiResponse({ status: 200, description: 'Marked as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('dmId') dmId: string,
  ) {
    return this.dmService.markAsRead(userId, dmId);
  }

  @Delete(':dmId')
  @ApiOperation({ summary: 'Delete DM' })
  @ApiResponse({ status: 200, description: 'DM deleted' })
  async deleteDm(
    @CurrentUser('id') userId: string,
    @Param('dmId') dmId: string,
  ) {
    return this.dmService.deleteDm(userId, dmId);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread DM count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.dmService.getUnreadCount(userId);
    return { unreadCount: count };
  }
}

