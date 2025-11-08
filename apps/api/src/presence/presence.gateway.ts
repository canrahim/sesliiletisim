import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: [
      process.env.CORS_ORIGIN || 'http://localhost:5173',
      'https://app.asforces.com',
      'https://asforces.com',
    ],
    credentials: true,
  },
  namespace: '/presence',
})
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PresenceGateway.name);

  constructor(
    private readonly presenceService: PresenceService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract and verify JWT token (same as MessageGateway)
      const token = client.handshake.auth?.token || 
                    client.handshake.headers?.authorization?.split(' ')[1] ||
                    client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Presence connection rejected - no token (socket: ${client.id})`);
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Attach user to socket
      client.data.user = payload;
      const userId = payload.sub;

      if (userId) {
        await this.presenceService.setUserOnline(userId, client.id);
        // Silent log to reduce spam
        this.logger.debug(`User ${userId} connected to presence (socket: ${client.id})`);

        // Get user activity
        const activity = await this.presenceService.getUserActivity(userId);
        
        // Broadcast presence update to ALL clients
        this.server.emit('presence-update', {
          userId,
          status: 'online',
          isOnline: true,
          activity: activity
        });
        
        this.logger.log(`📢 BROADCAST: User ${userId} is ONLINE (sent to all)`);
        
        // Start heartbeat to keep presence alive
        const heartbeatInterval = setInterval(async () => {
          try {
            const isStillConnected = this.server.sockets.sockets.has(client.id);
            if (isStillConnected) {
              await this.presenceService.setUserOnline(userId, client.id);
            } else {
              clearInterval(heartbeatInterval);
            }
          } catch (error) {
            clearInterval(heartbeatInterval);
          }
        }, 60000); // Renew every 60 seconds (well before 300s TTL)
        
        // Store interval for cleanup
        client.data.heartbeatInterval = heartbeatInterval;
      }
    } catch (error) {
      this.logger.error(`❌ Presence authentication failed for socket ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.user?.sub || client.data.user?.id;
    
    // Clear heartbeat interval
    if (client.data.heartbeatInterval) {
      clearInterval(client.data.heartbeatInterval);
    }
    
    if (userId) {
      await this.presenceService.setUserOffline(userId, client.id);
      this.logger.debug(`User ${userId} disconnected from presence (socket: ${client.id})`);

      // Check if user still has other connections
      const isOnline = await this.presenceService.isUserOnline(userId);
      
      if (!isOnline) {
        // Broadcast presence update to ALL clients
        this.server.emit('presence-update', {
          userId,
          status: 'offline',
          isOnline: false,
          lastSeen: new Date().toISOString(),
        });
        
        this.logger.log(`📢 BROADCAST: User ${userId} is OFFLINE (sent to all)`);
      } else {
        this.logger.debug(`User ${userId} still has active connections`);
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('update-presence')
  async handleUpdatePresence(
    @MessageBody() data: { status: 'online' | 'away' | 'busy' | 'offline' },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      await this.presenceService.updateUserStatus(userId, data.status);

      // Broadcast to all users
      this.server.emit('presence-update', {
        userId,
        status: data.status,
      });

      return { success: true, status: data.status };
    } catch (error) {
      this.logger.error(`Failed to update presence: ${error.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get-presence')
  async handleGetPresence(
    @MessageBody() data: { userIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub || client.data.user?.id;
    if (!userId) {
      this.logger.error('get-presence failed: No userId found in token');
      return { error: 'Unauthorized' };
    }
    
    this.logger.log(`get-presence called by ${userId} for ${data.userIds.length} users`);

    try {
      const presenceData = await this.presenceService.getMultipleUserPresence(
        data.userIds,
      );

      return { success: true, presence: presenceData };
    } catch (error) {
      this.logger.error(`Failed to get presence: ${error.message}`);
      return { error: error.message };
    }
  }

  // ❌ check-presence REMOVED - causes spam
  // Presence now ONLY updated via connect/disconnect broadcasts
  // Frontend should NOT request presence checks - only listen to broadcasts

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribe-server-presence')
  async handleSubscribeServerPresence(
    @MessageBody() data: { serverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // Join server presence room
      await client.join(`server-presence:${data.serverId}`);
      this.logger.log(`User ${userId} subscribed to server ${data.serverId} presence`);

      return { success: true, serverId: data.serverId };
    } catch (error) {
      this.logger.error(`Failed to subscribe to server presence: ${error.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('unsubscribe-server-presence')
  async handleUnsubscribeServerPresence(
    @MessageBody() data: { serverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // Leave server presence room
      await client.leave(`server-presence:${data.serverId}`);
      this.logger.log(`User ${userId} unsubscribed from server ${data.serverId} presence`);

      return { success: true, serverId: data.serverId };
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from server presence: ${error.message}`);
      return { error: error.message };
    }
  }
  
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('activity-update')
  async handleActivityUpdate(
    @MessageBody() data: { activity: string | null },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // Aktiviteyi kaydet (Redis'e)
      await this.presenceService.setUserActivity(userId, data.activity);
      
      // Tüm kullanıcılara broadcast
      this.server.emit('presence-update', {
        userId,
        status: 'online',
        isOnline: true,
        activity: data.activity
      });
      
      this.logger.log(`User ${userId} activity updated: ${data.activity || 'cleared'}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update activity: ${error.message}`);
      return { error: error.message };
    }
  }
}


