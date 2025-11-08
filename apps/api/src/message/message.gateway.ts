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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: [
      process.env.CORS_ORIGIN || 'http://localhost:5173',
      'https://app.asforces.com',
      'https://asforces.com',
    ],
    credentials: true,
  },
  namespace: '/messages',
})
export class MessageGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessageGateway.name);
  private readonly userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly messageService: MessageService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('MessageGateway initialized');
  }

  /**
   * Emit new message to channel subscribers
   */
  emitNewMessage(channelId: string, message: any) {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized yet');
      return;
    }
    
    const room = `channel:${channelId}`;
    
    try {
      this.logger.log(`📡 Emitting new-message to room: ${room}`);
      this.server.to(room).emit('new-message', message);
      this.logger.log('✅ Message emitted successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to emit message: ${error.message}`, error.stack);
    }
  }

  async handleConnection(client: Socket) {
    try {
      // Extract and verify JWT token
      const token = client.handshake.auth?.token || 
                    client.handshake.headers?.authorization?.split(' ')[1] ||
                    client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Connection rejected - no token (socket: ${client.id})`);
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
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(client.id);
        this.logger.log(`✅ User ${userId} connected to messages (socket: ${client.id})`);
      }
    } catch (error) {
      this.logger.error(`❌ Authentication failed for socket ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.user?.id;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.logger.log(`User ${userId} disconnected from messages (socket: ${client.id})`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody() data: { channelId: string; message: CreateMessageDto },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const message = await this.messageService.create(
        userId,
        data.channelId,
        data.message,
      );

      // Broadcast to all users in the channel
      this.server.to(`channel:${data.channelId}`).emit('new-message', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('edit-message')
  async handleEditMessage(
    @MessageBody() data: { messageId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const message = await this.messageService.update(
        userId,
        data.messageId,
        data.content,
      );

      // Get the channel ID to broadcast
      const fullMessage = await this.messageService.findOne(userId, data.messageId);
      this.server
        .to(`channel:${fullMessage.channel.id}`)
        .emit('message-updated', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Failed to edit message: ${error.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('delete-message')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // Get message before deleting to know the channel
      const message = await this.messageService.findOne(userId, data.messageId);
      const channelId = message.channel.id;

      await this.messageService.remove(userId, data.messageId);

      // Broadcast to all users in the channel
      this.server
        .to(`channel:${channelId}`)
        .emit('message-deleted', { messageId: data.messageId });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete message: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('join-channel')
  async handleJoinChannel(
    @MessageBody() data: { channelId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub || client.data.user?.id;
    
    this.logger.log(`🎯 join-channel event received - User: ${userId}, Channel: ${data.channelId}, Socket: ${client.id}`);
    
    if (!userId) {
      this.logger.warn(`❌ join-channel rejected - no user ID on socket ${client.id}`);
      return { error: 'Unauthorized' };
    }

    try {
      // Join socket room for this channel
      await client.join(`channel:${data.channelId}`);
      this.logger.log(`✅ User ${userId} joined channel room: channel:${data.channelId} (socket: ${client.id})`);

      return { success: true, channelId: data.channelId };
    } catch (error) {
      this.logger.error(`❌ Failed to join channel: ${error.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave-channel')
  async handleLeaveChannel(
    @MessageBody() data: { channelId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // Leave socket room for this channel
      await client.leave(`channel:${data.channelId}`);
      this.logger.log(`User ${userId} left channel ${data.channelId}`);

      // TODO: Clear typing indicator
      // await this.messageService.setTyping(userId, data.channelId, false);

      return { success: true, channelId: data.channelId };
    } catch (error) {
      this.logger.error(`Failed to leave channel: ${error.message}`);
      return { error: error.message };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { channelId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.id;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // TODO: Implement setTyping with Redis
      // await this.messageService.setTyping(userId, data.channelId, data.isTyping);

      // Broadcast to all users in the channel except sender
      client.to(`channel:${data.channelId}`).emit('user-typing', {
        userId,
        channelId: data.channelId,
        isTyping: data.isTyping,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to set typing status: ${error.message}`);
      return { error: error.message };
    }
  }
}


