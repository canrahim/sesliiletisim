import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new message
   */
  async create(userId: string, channelId: string, dto: CreateMessageDto) {
    // Check if user has access to the channel
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

    // Create message
    const message = await this.prisma.message.create({
      data: {
        content: dto.content,
        channelId,
        userId,
        attachments: dto.attachments || [],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        channel: true,
      },
    });

    this.logger.log(
      `Message created: ${message.id} in channel ${channelId} by user ${userId}`,
    );

    return message;
  }

  /**
   * Get messages in a channel (with pagination)
   */
  async findAll(
    userId: string,
    channelId: string,
    page = 1,
    limit = 50,
  ): Promise<{ messages: any[]; total: number; page: number; pages: number }> {
    // Check access
    await this.checkChannelAccess(userId, channelId);

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          channelId,
          isDeleted: false,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.message.count({
        where: {
          channelId,
          isDeleted: false,
        },
      }),
    ]);

    return {
      messages,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single message
   */
  async findOne(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        channel: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check access
    await this.checkChannelAccess(userId, message.channelId);

    return message;
  }

  /**
   * Update a message
   */
  async update(userId: string, messageId: string, dto: any) {
    // Get message
    const existingMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage) {
      throw new NotFoundException('Message not found');
    }

    // Check ownership
    if (existingMessage.userId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Check if deleted
    if (existingMessage.isDeleted) {
      throw new BadRequestException('Cannot edit deleted message');
    }

    // Update
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: dto.content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        channel: true,
      },
    });

    this.logger.log(`Message updated: ${message.id} by user ${userId}`);

    return message;
  }

  /**
   * Soft delete a message
   */
  async remove(userId: string, messageId: string) {
    // Get message
    const existingMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        channel: {
          include: {
            server: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!existingMessage) {
      throw new NotFoundException('Message not found');
    }

    // Check if deleted
    if (existingMessage.isDeleted) {
      throw new BadRequestException('Message already deleted');
    }

    // Check permission: owner or admin/moderator
    const isOwner = existingMessage.userId === userId;
    const serverMember = existingMessage.channel.server.members[0];
    const canDelete =
      isOwner ||
      (serverMember &&
        (['OWNER', 'ADMIN', 'MODERATOR'] as string[]).includes(serverMember.role));

    if (!canDelete) {
      throw new ForbiddenException(
        'You can only delete your own messages or you must be a moderator',
      );
    }

    // Soft delete
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: '[Deleted]',
      },
      include: {
        channel: true,
      },
    });

    this.logger.log(`Message deleted: ${message.id}`);

    return { success: true };
  }

  /**
   * Check if user has access to a channel
   */
  private async checkChannelAccess(userId: string, channelId: string) {
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
}
