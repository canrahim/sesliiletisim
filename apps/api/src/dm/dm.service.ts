import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DmService {
  constructor(private readonly prisma: PrismaService) {}

  // Send DM
  async sendDm(senderId: string, receiverId: string, content: string) {
    // Check if users are friends
    const friendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: receiverId, status: 'ACCEPTED' },
          { userId: receiverId, friendId: senderId, status: 'ACCEPTED' },
        ],
      },
    });

    if (!friendship) {
      throw new ForbiddenException('You can only send DMs to friends');
    }

    const dm = await this.prisma.directMessage.create({
      data: {
        senderId,
        receiverId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return dm;
  }

  // Get DM conversation with a friend
  async getConversation(userId: string, friendId: string, limit = 50) {
    const messages = await this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
        isDeleted: false,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return messages.reverse(); // Oldest first
  }

  // Mark DM as read
  async markAsRead(userId: string, dmId: string) {
    const dm = await this.prisma.directMessage.findUnique({
      where: { id: dmId },
    });

    if (!dm) {
      throw new NotFoundException('Message not found');
    }

    if (dm.receiverId !== userId) {
      throw new ForbiddenException('You can only mark your own messages as read');
    }

    return this.prisma.directMessage.update({
      where: { id: dmId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // Delete DM
  async deleteDm(userId: string, dmId: string) {
    const dm = await this.prisma.directMessage.findUnique({
      where: { id: dmId },
    });

    if (!dm) {
      throw new NotFoundException('Message not found');
    }

    if (dm.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    return this.prisma.directMessage.update({
      where: { id: dmId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: '[Deleted]',
      },
    });
  }

  // Get unread DM count
  async getUnreadCount(userId: string) {
    return this.prisma.directMessage.count({
      where: {
        receiverId: userId,
        isRead: false,
        isDeleted: false,
      },
    });
  }
}







