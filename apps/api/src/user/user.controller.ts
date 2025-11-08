import {
  Controller,
  Get,
  Put,
  Patch,
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

import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.userService.findById(userId);
  }

  @Get('me/sessions')
  @ApiOperation({ summary: 'Get current user sessions' })
  @ApiResponse({ status: 200, description: 'User sessions' })
  async getMySessions(@CurrentUser('id') userId: string) {
    return this.userService.getUserSessions(userId);
  }

  @Delete('me/sessions/:sessionId')
  @ApiOperation({ summary: 'Revoke a session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  async revokeSession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.userService.revokeSession(userId, sessionId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile (PUT)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMyProfilePut(
    @CurrentUser('id') userId: string,
    @Body() data: { displayName?: string; bio?: string; avatar?: string },
  ) {
    return this.userService.updateProfile(userId, data);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile (PATCH)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() data: { displayName?: string; bio?: string; avatar?: string },
  ) {
    return this.userService.updateProfile(userId, data);
  }

  @Get(':username')
  @ApiOperation({ summary: 'Get user by username' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByUsername(@Param('username') username: string) {
    return this.userService.findByUsername(username);
  }
}
