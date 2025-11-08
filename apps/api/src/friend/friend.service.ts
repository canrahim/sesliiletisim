import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FriendRequestStatus } from '@prisma/client';

@Injectable()
export class FriendService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Send friend request
  async sendFriendRequest(userId: string, targetUsername: string) {
    // Find target user
    const targetUser = await this.prisma.user.findUnique({
      where: { username: targetUsername },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.id === userId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if already friends or request exists
    const existing = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId: targetUser.id },
          { userId: targetUser.id, friendId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException('Already friends');
      }
      if (existing.status === 'PENDING') {
        throw new ConflictException('Friend request already sent');
      }
      if (existing.status === 'BLOCKED') {
        throw new BadRequestException('Cannot send friend request');
      }
    }

    // Create friend request (both directions for easier querying)
    const friendRequest = await this.prisma.friend.create({
      data: {
        userId,
        friendId: targetUser.id,
        requesterId: userId,
        status: 'PENDING',
      },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isOnline: true,
          },
        },
      },
    });

    return friendRequest;
  }

  // Accept friend request
  async acceptFriendRequest(userId: string, friendRequestId: string) {
    const friendRequest = await this.prisma.friend.findUnique({
      where: { id: friendRequestId },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    // Can only accept if you're the receiver
    if (friendRequest.friendId !== userId) {
      throw new BadRequestException('You can only accept requests sent to you');
    }

    if (friendRequest.status !== 'PENDING') {
      throw new BadRequestException('Request is not pending');
    }

    // Update to accepted
    const updated = await this.prisma.friend.update({
      where: { id: friendRequestId },
      data: { status: 'ACCEPTED' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isOnline: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isOnline: true,
          },
        },
      },
    });

    return updated;
  }

  // Decline friend request
  async declineFriendRequest(userId: string, friendRequestId: string) {
    const friendRequest = await this.prisma.friend.findUnique({
      where: { id: friendRequestId },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendRequest.friendId !== userId) {
      throw new BadRequestException('You can only decline requests sent to you');
    }

    await this.prisma.friend.delete({
      where: { id: friendRequestId },
    });

    return { success: true };
  }

  // Remove friend
  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { userId, friendId, status: 'ACCEPTED' },
          { userId: friendId, friendId: userId, status: 'ACCEPTED' },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friend.delete({
      where: { id: friendship.id },
    });

    return { success: true };
  }

  // Get all friends
  async getFriends(userId: string) {
    const friends = await this.prisma.friend.findMany({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isOnline: true,
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isOnline: true,
          },
        },
      },
    });

    // Return the friend (not self) with real-time online status
    const friendsList = friends.map((f) => {
      const isFriend = f.userId === userId;
      return isFriend ? f.friend : f.user;
    });

    // Return friends list (isOnline will be updated via broadcast)
    return friendsList.map(friend => ({
      ...friend,
      isOnline: false  // Frontend'de broadcast ile güncellenecek
    }));
  }

  // Get pending friend requests (received)
  async getPendingRequests(userId: string) {
    const requests = await this.prisma.friend.findMany({
      where: {
        friendId: userId,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isOnline: true,
          },
        },
      },
    });

    return requests;
  }

  // Block user
  async blockUser(userId: string, targetUserId: string) {
    // Delete any existing friendship
    await this.prisma.friend.deleteMany({
      where: {
        OR: [
          { userId, friendId: targetUserId },
          { userId: targetUserId, friendId: userId },
        ],
      },
    });

    // Create block record
    const block = await this.prisma.friend.create({
      data: {
        userId,
        friendId: targetUserId,
        requesterId: userId,
        status: 'BLOCKED',
      },
    });

    return block;
  }
}

