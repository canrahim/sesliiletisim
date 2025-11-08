import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { ChannelDto } from './dto/channel.dto';
import { ChannelType } from '@prisma/client';

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new channel in a server
   */
  async create(
    userId: string,
    serverId: string,
    createChannelDto: CreateChannelDto,
  ) {
    // Check if user is owner or admin of the server
    const member = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId,
        },
      },
      include: {
        server: true,
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only server owners and admins can create channels',
      );
    }

    // Create channel
    const channel = await this.prisma.channel.create({
      data: {
        name: createChannelDto.name,
        type: createChannelDto.type || ChannelType.TEXT,
        description: createChannelDto.description,
        serverId,
      },
    });

    this.logger.log(
      `Channel created: ${channel.name} in server ${serverId} by user ${userId}`,
    );

    return channel;
  }

  /**
   * Get all channels in a server
   */
  async findAllByServer(userId: string, serverId: string) {
    // Check if user is a member
    const member = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: {
          userId,
          serverId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    const channels = await this.prisma.channel.findMany({
      where: { serverId },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    });

    return channels;
  }

  /**
   * Get a single channel
   */
  async findOne(userId: string, channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    if (channel.server.members.length === 0) {
      throw new ForbiddenException('You are not a member of this server');
    }

    return channel;
  }

  /**
   * Update a channel
   */
  async update(
    userId: string,
    channelId: string,
    updateChannelDto: Partial<ChannelDto>,
  ) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const member = channel.server.members[0];
    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only server owners and admins can update channels',
      );
    }

    const updatedChannel = await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        name: updateChannelDto.name,
        description: updateChannelDto.description,
      },
    });

    this.logger.log(`Channel updated: ${channelId} by user ${userId}`);

    return updatedChannel;
  }

  /**
   * Delete a channel
   */
  async remove(userId: string, channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        server: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const member = channel.server.members[0];
    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only server owners and admins can delete channels',
      );
    }

    // Check if this is the last channel
    const channelCount = await this.prisma.channel.count({
      where: { serverId: channel.serverId },
    });

    if (channelCount <= 1) {
      throw new BadRequestException(
        'Cannot delete the last channel in a server',
      );
    }

    await this.prisma.channel.delete({
      where: { id: channelId },
    });

    this.logger.log(`Channel deleted: ${channelId} by user ${userId}`);

    return { message: 'Channel deleted successfully' };
  }

  /**
   * Get channel statistics
   */
  async getChannelStats(userId: string, channelId: string) {
    const channel = await this.findOne(userId, channelId);

    if (channel.type === ChannelType.TEXT) {
      const messageCount = await this.prisma.message.count({
        where: { channelId },
      });

      return {
        channelId,
        type: channel.type,
        messageCount,
      };
    } else if (channel.type === ChannelType.VOICE) {
      // Voice channel stats could include active users, etc.
      return {
        channelId,
        type: channel.type,
        activeUsers: 0, // This would be tracked in Redis
      };
    }

    return {
      channelId,
      type: channel.type,
    };
  }
}


