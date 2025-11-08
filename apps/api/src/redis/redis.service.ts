import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export interface RedisOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryStrategy?: (times: number) => number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  
  constructor(@Inject('REDIS_OPTIONS') private options: RedisOptions) {
    this.client = new Redis(this.options);
    
    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });
    
    this.client.on('error', (error) => {
      this.logger.error('Redis error:', error);
    });
    
    this.client.on('reconnecting', () => {
      this.logger.log('Redis reconnecting...');
    });
  }

  /**
   * Get Redis client instance
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Session management
   */
  async setSession(sessionId: string, data: any, ttlSeconds?: number): Promise<void> {
    const key = `session:${sessionId}`;
    const value = JSON.stringify(data);
    
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async getSession(sessionId: string): Promise<any> {
    const key = `session:${sessionId}`;
    const value = await this.client.get(key);
    
    if (!value) {
      return null;
    }
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const key = `session:${sessionId}`;
    const result = await this.client.del(key);
    return result === 1;
  }

  async extendSession(sessionId: string, ttlSeconds: number): Promise<boolean> {
    const key = `session:${sessionId}`;
    const result = await this.client.expire(key, ttlSeconds);
    return result === 1;
  }

  /**
   * Rate limiting
   */
  async incrementRateLimit(identifier: string, windowSeconds: number = 60): Promise<number> {
    const key = `ratelimit:${identifier}`;
    const multi = this.client.multi();
    
    multi.incr(key);
    multi.expire(key, windowSeconds);
    
    const results = await multi.exec();
    return results?.[0]?.[1] as number;
  }

  async getRateLimit(identifier: string): Promise<number> {
    const key = `ratelimit:${identifier}`;
    const count = await this.client.get(key);
    return parseInt(count || '0', 10);
  }

  /**
   * Cache management
   */
  async setCache(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const cacheKey = `cache:${key}`;
    const data = JSON.stringify(value);
    
    if (ttlSeconds) {
      await this.client.set(cacheKey, data, 'EX', ttlSeconds);
    } else {
      await this.client.set(cacheKey, data);
    }
  }

  async getCache(key: string): Promise<any> {
    const cacheKey = `cache:${key}`;
    const value = await this.client.get(cacheKey);
    
    if (!value) {
      return null;
    }
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async deleteCache(key: string): Promise<boolean> {
    const cacheKey = `cache:${key}`;
    const result = await this.client.del(cacheKey);
    return result === 1;
  }

  /**
   * Presence tracking
   */
  async setUserPresence(userId: string, status: string, ttlSeconds: number = 300): Promise<void> {
    const key = `presence:${userId}`;
    await this.client.set(key, status, 'EX', ttlSeconds);
  }

  async getUserPresence(userId: string): Promise<string | null> {
    const key = `presence:${userId}`;
    return this.client.get(key);
  }

  async getMultipleUserPresence(userIds: string[]): Promise<Record<string, string | null>> {
    if (userIds.length === 0) {
      return {};
    }

    const keys = userIds.map(id => `presence:${id}`);
    const values = await this.client.mget(...keys);
    
    const result: Record<string, string | null> = {};
    userIds.forEach((id, index) => {
      result[id] = values[index];
    });
    
    return result;
  }

  /**
   * Pub/Sub
   */
  async publish(channel: string, message: any): Promise<number> {
    const data = JSON.stringify(message);
    return this.client.publish(channel, data);
  }

  subscribe(channel: string, callback: (message: any) => void): void {
    const subscriber = new Redis(this.options);
    
    subscriber.on('message', (chan, message) => {
      if (chan === channel) {
        try {
          const data = JSON.parse(message);
          callback(data);
        } catch {
          callback(message);
        }
      }
    });
    
    subscriber.subscribe(channel);
  }

  /**
   * Generic operations
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async flushDb(): Promise<void> {
    await this.client.flushdb();
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }
}
