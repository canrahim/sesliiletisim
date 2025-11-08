import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DmService } from './dm.service';

@WebSocketGateway({
  cors: {
    origin: [
      process.env.CORS_ORIGIN || 'http://localhost:5173',
      'https://app.asforces.com',
      'https://asforces.com',
    ],
    credentials: true,
  },
  namespace: '/dm',
})
export class DmGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DmGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  constructor(
    private readonly dmService: DmService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('DM Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || 
                    client.handshake.headers?.authorization?.split(' ')[1] ||
                    client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`DM connection rejected - no token`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      client.data.user = payload;
      const userId = payload.sub;

      if (userId) {
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(client.id);
        
        // Join user's personal room
        client.join(`user:${userId}`);
        
        this.logger.log(`✅ User ${userId} connected to DM (socket: ${client.id})`);
      }
    } catch (error) {
      this.logger.error(`❌ DM authentication failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.sub || client.data.user?.id;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.logger.log(`User ${userId} disconnected from DM`);
    }
  }

  /**
   * Emit new DM to recipient
   */
  emitNewDm(receiverId: string, dm: any) {
    this.logger.log(`📨 Emitting DM to user:${receiverId}`);
    this.server.to(`user:${receiverId}`).emit('new-dm', dm);
  }

  @SubscribeMessage('send-dm')
  async handleSendDm(
    @MessageBody() data: { receiverId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.user?.sub || client.data.user?.id;
    
    if (!senderId) {
      return { error: 'Unauthorized' };
    }

    try {
      const dm = await this.dmService.sendDm(senderId, data.receiverId, data.content);
      
      // Emit to receiver
      this.emitNewDm(data.receiverId, dm);
      
      return { success: true, dm };
    } catch (error) {
      this.logger.error(`Failed to send DM: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @MessageBody() data: { dmId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub || client.data.user?.id;
    
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      await this.dmService.markAsRead(userId, data.dmId);
      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }
}





