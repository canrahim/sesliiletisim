import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly PRESENCE_TTL = 300; // 5 minutes

  constructor(private readonly redis: RedisService) {}

  /**
   * Set user as online (called on connection)
   */
  async setUserOnline(userId: string, socketId: string): Promise<void> {
    try {
      // Add socket to user's connection set
      const key = `presence:sockets:${userId}`;
      const client = this.redis.getClient();
      await client.sadd(key, socketId);
      await client.expire(key, this.PRESENCE_TTL);

      // Set user status
      await this.redis.setUserPresence(userId, 'online', this.PRESENCE_TTL);

      this.logger.debug(`User ${userId} set online (socket: ${socketId})`);
    } catch (error) {
      this.logger.error(`Failed to set user online: ${error.message}`);
    }
  }

  /**
   * Set user as offline (called on disconnect)
   */
  async setUserOffline(userId: string, socketId: string): Promise<void> {
    try {
      // Remove socket from user's connection set
      const key = `presence:sockets:${userId}`;
      const client = this.redis.getClient();
      await client.srem(key, socketId);

      // Check if user has other connections
      const remainingSockets = await client.scard(key);
      
      if (remainingSockets === 0) {
        // No more connections, set as offline
        await this.redis.setUserPresence(userId, 'offline', this.PRESENCE_TTL);
        
        // Set last seen
        await this.redis.set(
          `presence:lastseen:${userId}`,
          new Date().toISOString(),
          86400, // 24 hours TTL
        );
        
        this.logger.debug(`User ${userId} set offline (no more connections)`);
      } else {
        this.logger.debug(
          `User ${userId} still has ${remainingSockets} connection(s)`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to set user offline: ${error.message}`);
    }
  }

  /**
   * Update user status (online, away, busy, offline)
   */
  async updateUserStatus(userId: string, status: PresenceStatus): Promise<void> {
    try {
      await this.redis.setUserPresence(userId, status, this.PRESENCE_TTL);
      this.logger.debug(`User ${userId} status updated to ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update user status: ${error.message}`);
    }
  }

  /**
   * Get user presence status
   */
  async getUserPresence(userId: string): Promise<PresenceStatus | null> {
    try {
      const status = await this.redis.getUserPresence(userId);
      return (status as PresenceStatus) || null;
    } catch (error) {
      this.logger.error(`Failed to get user presence: ${error.message}`);
      return null;
    }
  }

  /**
   * Get presence for multiple users
   */
  async getMultipleUserPresence(
    userIds: string[],
  ): Promise<Record<string, PresenceStatus | null>> {
    try {
      const presenceData = await this.redis.getMultipleUserPresence(userIds);
      return presenceData as Record<string, PresenceStatus | null>;
    } catch (error) {
      this.logger.error(`Failed to get multiple user presence: ${error.message}`);
      return {};
    }
  }

  /**
   * Check if user is online (has active connections)
   */
  async isUserOnline(userId: string): Promise<boolean> {
    try {
      const key = `presence:sockets:${userId}`;
      const client = this.redis.getClient();
      const socketCount = await client.scard(key);
      return socketCount > 0;
    } catch (error) {
      this.logger.error(`Failed to check user online status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get user's last seen timestamp
   */
  async getLastSeen(userId: string): Promise<string | null> {
    try {
      const lastSeen = await this.redis.get(`presence:lastseen:${userId}`);
      return lastSeen;
    } catch (error) {
      this.logger.error(`Failed to get last seen: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all online users in a server
   */
  async getServerOnlineUsers(userIds: string[]): Promise<string[]> {
    try {
      const onlineUsers: string[] = [];
      
      for (const userId of userIds) {
        const isOnline = await this.isUserOnline(userId);
        if (isOnline) {
          onlineUsers.push(userId);
        }
      }
      
      return onlineUsers;
    } catch (error) {
      this.logger.error(`Failed to get server online users: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Set user activity (oyun durumu)
   */
  async setUserActivity(userId: string, activity: string | null): Promise<void> {
    try {
      const key = `presence:activity:${userId}`;
      const client = this.redis.getClient();
      
      if (activity) {
        await client.set(key, activity);
        await client.expire(key, this.PRESENCE_TTL);
        this.logger.debug(`User ${userId} activity set: ${activity}`);
      } else {
        await client.del(key);
        this.logger.debug(`User ${userId} activity cleared`);
      }
    } catch (error) {
      this.logger.error(`Failed to set user activity: ${error.message}`);
    }
  }
  
  /**
   * Get user activity
   */
  async getUserActivity(userId: string): Promise<string | null> {
    try {
      const key = `presence:activity:${userId}`;
      const activity = await this.redis.get(key);
      return activity;
    } catch (error) {
      this.logger.error(`Failed to get user activity: ${error.message}`);
      return null;
    }
  }
}


