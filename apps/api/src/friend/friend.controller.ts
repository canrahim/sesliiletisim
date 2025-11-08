import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FriendService } from './friend.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request')
  @ApiOperation({ summary: 'Send friend request' })
  @ApiResponse({ status: 201, description: 'Friend request sent' })
  async sendRequest(
    @CurrentUser('id') userId: string,
    @Body('username') username: string,
  ) {
    return this.friendService.sendFriendRequest(userId, username);
  }

  @Post(':requestId/accept')
  @ApiOperation({ summary: 'Accept friend request' })
  @ApiResponse({ status: 200, description: 'Friend request accepted' })
  async acceptRequest(
    @CurrentUser('id') userId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.friendService.acceptFriendRequest(userId, requestId);
  }

  @Delete(':requestId/decline')
  @ApiOperation({ summary: 'Decline friend request' })
  @ApiResponse({ status: 200, description: 'Friend request declined' })
  async declineRequest(
    @CurrentUser('id') userId: string,
    @Param('requestId') requestId: string,
  ) {
    return this.friendService.declineFriendRequest(userId, requestId);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: 'Remove friend' })
  @ApiResponse({ status: 200, description: 'Friend removed' })
  async removeFriend(
    @CurrentUser('id') userId: string,
    @Param('friendId') friendId: string,
  ) {
    return this.friendService.removeFriend(userId, friendId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all friends' })
  @ApiResponse({ status: 200, description: 'Friends list' })
  async getFriends(@CurrentUser('id') userId: string) {
    return this.friendService.getFriends(userId);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get pending friend requests' })
  @ApiResponse({ status: 200, description: 'Pending requests' })
  async getPendingRequests(@CurrentUser('id') userId: string) {
    return this.friendService.getPendingRequests(userId);
  }

  @Post(':userId/block')
  @ApiOperation({ summary: 'Block user' })
  @ApiResponse({ status: 201, description: 'User blocked' })
  async blockUser(
    @CurrentUser('id') userId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.friendService.blockUser(userId, targetUserId);
  }
}

