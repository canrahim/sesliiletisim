import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface PeerConnection {
  userId: string;
  channelId: string;
  socketId: string;
  peerId: string;
  joinedAt: Date;
}

@Injectable()
export class RtcService {
  private readonly logger = new Logger(RtcService.name);
  private readonly connections = new Map<string, PeerConnection>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async joinVoiceChannel(
    userId: string,
    channelId: string,
    socketId: string,
  ): Promise<PeerConnection[]> {
    try {
      // Check if user has permission to join
      const member = await this.prisma.serverMember.findFirst({
        where: {
          userId,
          server: {
            channels: {
              some: { id: channelId },
            },
          },
        },
        include: {
          server: {
            include: {
              channels: true,
            },
          },
        },
      });

      if (!member) {
        throw new Error('User not a member of this server');
      }

      const channel = member.server.channels.find((ch) => ch.id === channelId);
      if (!channel || channel.type !== 'VOICE') {
        throw new Error('Invalid voice channel');
      }

      // Create peer connection
      const connection: PeerConnection = {
        userId,
        channelId,
        socketId,
        peerId: `${userId}_${Date.now()}`,
        joinedAt: new Date(),
      };

      // Store connection
      const key = `${channelId}:${userId}`;
      this.connections.set(key, connection);

      // Store in Redis for scaling
      await this.redis.set(
        `voice:${key}`,
        JSON.stringify(connection),
        60 * 30, // 30 minutes TTL
      );

      // Get all connections in channel
      const channelConnections = await this.getChannelConnections(channelId);

      this.logger.log(
        `User ${userId} joined voice channel ${channelId}. Total users: ${channelConnections.length}`,
      );

      return channelConnections;
    } catch (error) {
      this.logger.error('Error joining voice channel:', error);
      throw error;
    }
  }

  async leaveVoiceChannel(
    userId: string,
    channelId: string,
  ): Promise<void> {
    try {
      const key = `${channelId}:${userId}`;
      this.connections.delete(key);

      // Remove from Redis
      await this.redis.del(`voice:${key}`);

      this.logger.log(`User ${userId} left voice channel ${channelId}`);
    } catch (error) {
      this.logger.error('Error leaving voice channel:', error);
      throw error;
    }
  }

  async getChannelConnections(channelId: string): Promise<PeerConnection[]> {
    const connections: PeerConnection[] = [];

    // Get from memory
    for (const [key, connection] of this.connections) {
      if (key.startsWith(`${channelId}:`)) {
        connections.push(connection);
      }
    }

    // Also check Redis for distributed setup
    const keys = await this.redis.keys(`voice:${channelId}:*`);
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data && !connections.find((c) => c.userId === JSON.parse(data).userId)) {
        connections.push(JSON.parse(data));
      }
    }

    return connections;
  }

  async getUserConnection(
    userId: string,
    channelId: string,
  ): Promise<PeerConnection | null> {
    const key = `${channelId}:${userId}`;
    const connection = this.connections.get(key);

    if (connection) return connection;

    // Check Redis
    const data = await this.redis.get(`voice:${key}`);
    return data ? JSON.parse(data) : null;
  }

  async updateConnectionSocket(
    userId: string,
    channelId: string,
    socketId: string,
  ): Promise<void> {
    const key = `${channelId}:${userId}`;
    const connection = this.connections.get(key);

    if (connection) {
      connection.socketId = socketId;
      await this.redis.set(
        `voice:${key}`,
        JSON.stringify(connection),
        60 * 30,
      );
    }
  }

  async cleanupDisconnectedUsers(): Promise<void> {
    try {
      const now = Date.now();
      const timeout = 60000; // 1 minute timeout

      for (const [key, connection] of this.connections) {
        if (now - connection.joinedAt.getTime() > timeout * 10) {
          // 10 minutes max
          this.connections.delete(key);
          await this.redis.del(`voice:${key}`);
        }
      }
    } catch (error) {
      this.logger.error('Error cleaning up connections:', error);
    }
  }

  // ICE server configuration
  getIceServers() {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN servers if configured
      ...(process.env.TURN_URL
        ? [
            {
              urls: process.env.TURN_URL,
              username: process.env.TURN_USERNAME,
              credential: process.env.TURN_CREDENTIAL,
            },
          ]
        : []),
    ];
  }
}
