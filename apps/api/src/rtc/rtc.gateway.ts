import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RtcService } from './rtc.service';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  currentChannel?: string;
}

@WebSocketGateway({
  namespace: 'rtc',
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3002',
      'https://app.asforces.com',
      'https://asforces.com',
    ],
    credentials: true,
  },
})
export class RtcGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RtcGateway.name);

  constructor(
    private readonly rtcService: RtcService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('RTC Gateway initialized');
  }

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      // Extract and verify token
      const token = socket.handshake.auth?.token;
      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      socket.userId = payload.sub;

      this.logger.log(`User ${socket.userId} connected to RTC`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.userId && socket.currentChannel) {
      await this.handleLeaveChannel(socket);
    }
    this.logger.log(`User ${socket.userId} disconnected from RTC`);
  }

  @SubscribeMessage('join-voice')
  async handleJoinVoice(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { channelId: string },
  ) {
    try {
      const { channelId } = data;

      // Leave current channel if any
      if (socket.currentChannel) {
        await this.handleLeaveChannel(socket);
      }

      // Join new channel
      const connections = await this.rtcService.joinVoiceChannel(
        socket.userId!,
        channelId,
        socket.id,
      );

      // Join socket room
      socket.join(`voice:${channelId}`);
      socket.currentChannel = channelId;

      // Get ICE servers
      const iceServers = this.rtcService.getIceServers();

      // Send current participants to new user
      socket.emit('voice-users', {
        channelId,
        users: connections.map((c) => ({
          userId: c.userId,
          peerId: c.peerId,
          socketId: c.socketId,
        })),
        iceServers,
      });

      // Notify the user they successfully joined
      socket.emit('voice-joined', {
        channelId,
        success: true,
      });

      // Notify others about new user
      socket.to(`voice:${channelId}`).emit('user-joined-voice', {
        userId: socket.userId,
        peerId: connections.find((c) => c.userId === socket.userId)?.peerId,
        socketId: socket.id,
      });

      this.logger.log(`User ${socket.userId} joined voice channel ${channelId}`);
    } catch (error) {
      this.logger.error('Error joining voice:', error);
      socket.emit('error', { message: 'Failed to join voice channel' });
    }
  }

  @SubscribeMessage('leave-voice')
  async handleLeaveVoice(@ConnectedSocket() socket: AuthenticatedSocket) {
    await this.handleLeaveChannel(socket);
  }

  private async handleLeaveChannel(socket: AuthenticatedSocket) {
    try {
      if (!socket.currentChannel) return;

      const channelId = socket.currentChannel;

      await this.rtcService.leaveVoiceChannel(socket.userId!, channelId);

      // Leave socket room
      socket.leave(`voice:${channelId}`);

      // Notify others
      socket.to(`voice:${channelId}`).emit('user-left-voice', {
        userId: socket.userId,
      });

      socket.currentChannel = undefined;

      this.logger.log(`User ${socket.userId} left voice channel ${channelId}`);
    } catch (error) {
      this.logger.error('Error leaving voice:', error);
    }
  }

  // WebRTC Signaling

  @SubscribeMessage('offer')
  async handleOffer(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string; offer: RTCSessionDescriptionInit },
  ) {
    try {
      const { targetUserId, offer } = data;

      // Get target user's socket
      const targetConnection = await this.rtcService.getUserConnection(
        targetUserId,
        socket.currentChannel!,
      );

      if (targetConnection) {
        this.server.to(targetConnection.socketId).emit('offer', {
          userId: socket.userId,
          offer,
        });
      }
    } catch (error) {
      this.logger.error('Error handling offer:', error);
    }
  }

  @SubscribeMessage('answer')
  async handleAnswer(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string; answer: RTCSessionDescriptionInit },
  ) {
    try {
      const { targetUserId, answer } = data;

      const targetConnection = await this.rtcService.getUserConnection(
        targetUserId,
        socket.currentChannel!,
      );

      if (targetConnection) {
        this.server.to(targetConnection.socketId).emit('answer', {
          userId: socket.userId,
          answer,
        });
      }
    } catch (error) {
      this.logger.error('Error handling answer:', error);
    }
  }

  @SubscribeMessage('ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string; candidate: RTCIceCandidateInit },
  ) {
    try {
      const { targetUserId, candidate } = data;

      const targetConnection = await this.rtcService.getUserConnection(
        targetUserId,
        socket.currentChannel!,
      );

      if (targetConnection) {
        this.server.to(targetConnection.socketId).emit('ice-candidate', {
          userId: socket.userId,
          candidate,
        });
      }
    } catch (error) {
      this.logger.error('Error handling ICE candidate:', error);
    }
  }

  // Audio state management

  @SubscribeMessage('audio-state')
  async handleAudioState(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { isMuted: boolean },
  ) {
    try {
      if (!socket.currentChannel) return;

      // Broadcast to all users in channel
      socket.to(`voice:${socket.currentChannel}`).emit('user-audio-state', {
        userId: socket.userId,
        isMuted: data.isMuted,
      });
    } catch (error) {
      this.logger.error('Error handling audio state:', error);
    }
  }

  @SubscribeMessage('speaking')
  async handleSpeaking(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { isSpeaking: boolean },
  ) {
    try {
      if (!socket.currentChannel) return;

      socket.to(`voice:${socket.currentChannel}`).emit('user-speaking', {
        userId: socket.userId,
        isSpeaking: data.isSpeaking,
      });
    } catch (error) {
      this.logger.error('Error handling speaking state:', error);
    }
  }

  // PTT State Management
  @SubscribeMessage('ptt-state')
  async handlePTTState(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { transmitting: boolean },
  ) {
    try {
      if (!socket.currentChannel) return;

      // Broadcast PTT state to all users in channel
      socket.to(`voice:${socket.currentChannel}`).emit('peer-ptt-state', {
        userId: socket.userId,
        peerId: socket.userId,
        transmitting: data.transmitting,
      });

      this.logger.debug(
        `User ${socket.userId} PTT state: ${data.transmitting ? 'transmitting' : 'idle'}`,
      );
    } catch (error) {
      this.logger.error('Error handling PTT state:', error);
    }
  }

  // VAD State Management  
  @SubscribeMessage('vad-state')
  async handleVADState(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { active: boolean; level?: number },
  ) {
    try {
      if (!socket.currentChannel) return;

      // Could be used for visual indicators
      socket.to(`voice:${socket.currentChannel}`).emit('peer-vad-state', {
        userId: socket.userId,
        active: data.active,
        level: data.level,
      });
    } catch (error) {
      this.logger.error('Error handling VAD state:', error);
    }
  }

  // Connection quality reporting
  @SubscribeMessage('connection-quality')
  async handleConnectionQuality(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { quality: 'good' | 'moderate' | 'poor'; stats: any },
  ) {
    try {
      this.logger.debug(
        `User ${socket.userId} connection quality: ${data.quality}`,
        data.stats,
      );

      // Could store this in Redis for monitoring
    } catch (error) {
      this.logger.error('Error handling connection quality:', error);
    }
  }
}
