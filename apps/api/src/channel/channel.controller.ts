import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChannelService } from './channel.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChannelDto } from './dto/channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('channels')
@Controller('channels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Post('server/:serverId')
  @ApiOperation({ summary: 'Create a new channel in a server' })
  @ApiResponse({
    status: 201,
    description: 'Channel created successfully',
    type: ChannelDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @CurrentUser('id') userId: string,
    @Param('serverId') serverId: string,
    @Body() createChannelDto: CreateChannelDto,
  ) {
    return this.channelService.create(userId, serverId, createChannelDto);
  }

  @Get('server/:serverId')
  @ApiOperation({ summary: 'Get all channels in a server' })
  @ApiResponse({
    status: 200,
    description: 'Channels retrieved successfully',
    type: [ChannelDto],
  })
  async findAllByServer(
    @CurrentUser('id') userId: string,
    @Param('serverId') serverId: string,
  ) {
    return this.channelService.findAllByServer(userId, serverId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single channel' })
  @ApiResponse({
    status: 200,
    description: 'Channel retrieved successfully',
    type: ChannelDto,
  })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id') channelId: string,
  ) {
    return this.channelService.findOne(userId, channelId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a channel' })
  @ApiResponse({
    status: 200,
    description: 'Channel updated successfully',
    type: ChannelDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') channelId: string,
    @Body() updateChannelDto: Partial<ChannelDto>,
  ) {
    return this.channelService.update(userId, channelId, updateChannelDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a channel' })
  @ApiResponse({ status: 200, description: 'Channel deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') channelId: string,
  ) {
    return this.channelService.remove(userId, channelId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get channel statistics' })
  @ApiResponse({ status: 200, description: 'Channel stats retrieved' })
  async getStats(
    @CurrentUser('id') userId: string,
    @Param('id') channelId: string,
  ) {
    return this.channelService.getChannelStats(userId, channelId);
  }
}


