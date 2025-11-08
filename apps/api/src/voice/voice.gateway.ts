// apps/api/src/voice/voice.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface VoiceUser {
  id: string;
  socketId: string;
  roomId: string;
  channelId: string;
  username: string;
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing?: boolean;
  isVideoOn?: boolean;
  hasScreenAudio?: boolean;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  data: any;
}

@WebSocketGateway({
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3002',
      'https://app.asforces.com',
      'https://asforces.com',
    ],
    credentials: true,
  },
  namespace: 'voice',
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private voiceUsers = new Map<string, VoiceUser>();
  private voiceChannels = new Map<string, Set<string>>(); // channelId -> Set<socketId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Yeni bağlantı
   */
  async handleConnection(client: Socket) {
    try {
      // Token'ı doğrula
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token.replace('Bearer ', ''));
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      // Kullanıcı bilgilerini socket'e ekle
      client.data.userId = user.id;
      client.data.username = user.username;

      console.log(`[Voice] User connected: ${user.username} (${client.id})`);

      // Redis'te online durumunu güncelle
      await this.redis.setUserPresence(user.id, 'online');
    } catch (error) {
      console.error('[Voice] Connection error:', error);
      client.disconnect();
    }
  }

  /**
   * Bağlantı koptuğunda
   */
  async handleDisconnect(client: Socket) {
    const voiceUser = this.voiceUsers.get(client.id);
    
    if (voiceUser) {
      // Ses kanalından çıkar
      await this.leaveVoiceChannel(client);
      
      // Redis'te durumu güncelle
      await this.redis.setUserPresence(voiceUser.id, 'offline');
    }

    console.log(`[Voice] User disconnected: ${client.data.username} (${client.id})`);
  }

  /**
   * Ses kanalına katıl
   */
  @SubscribeMessage('join-voice')
  async handleJoinVoice(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; channelId: string },
  ) {
    const { roomId, channelId } = data;
    const userId = client.data.userId;
    const username = client.data.username;

    console.log(`[Voice] ${username} joining channel ${channelId}`);

    // Kullanıcının server üyeliğini kontrol et
    const member = await this.prisma.serverMember.findUnique({
      where: {
        userId_serverId: { userId, serverId: roomId },
      },
      include: {
        server: true,
      },
    });

    if (!member) {
      client.emit('error', { message: 'Not a member of this server' });
      return;
    }

    // Kanalın varlığını kontrol et
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        serverId: roomId,
        type: 'VOICE',
      },
    });

    if (!channel) {
      client.emit('error', { message: 'Voice channel not found' });
      return;
    }

    // Önceki kanaldan çık
    await this.leaveVoiceChannel(client);

    // Yeni ses kullanıcısı oluştur
    const voiceUser: VoiceUser = {
      id: userId,
      socketId: client.id,
      roomId,
      channelId,
      username,
      isMuted: false,
      isDeafened: false,
      hasScreenAudio: false,
    };

    this.voiceUsers.set(client.id, voiceUser);

    // Kanala ekle
    if (!this.voiceChannels.has(channelId)) {
      this.voiceChannels.set(channelId, new Set());
    }
    this.voiceChannels.get(channelId)!.add(client.id);

    // Socket.io odasına katıl
    await client.join(`voice:${channelId}`);

    // Kanaldaki diğer kullanıcıları al
    const channelUsers = this.voiceChannels.get(channelId);
    const otherUsers: string[] = [];

    if (channelUsers) {
      for (const socketId of channelUsers) {
        if (socketId !== client.id) {
          const user = this.voiceUsers.get(socketId);
          if (user) {
            otherUsers.push(user.id);
            
            // Diğer kullanıcılara yeni katılımı bildir
            this.server.to(socketId).emit('peer-joined', {
              peerId: userId,
              username,
              shouldOffer: false,
              isScreenSharing: voiceUser.isScreenSharing || false,
              isVideoOn: voiceUser.isVideoOn || false,
              hasScreenAudio: voiceUser.hasScreenAudio || false,
            });
          }
        }
      }
    }

    // Yeni katılan kullanıcıya mevcut kullanıcıları gönder
    for (const peerId of otherUsers) {
      const peerUser = Array.from(this.voiceUsers.values()).find(u => u.id === peerId);
      client.emit('peer-joined', {
        peerId,
        username: peerUser?.username || 'Unknown',
        shouldOffer: true, // Yeni katılan offer gönderecek
        isScreenSharing: peerUser?.isScreenSharing || false,
        isVideoOn: peerUser?.isVideoOn || false,
        hasScreenAudio: peerUser?.hasScreenAudio || false,
      });
    }

    // ICE sunucularını gönder
    client.emit('ice-servers', this.getIceServers());

    // Kanaldaki kullanıcı sayısını güncelle
    this.broadcastChannelUpdate(channelId);

    console.log(`[Voice] ${username} joined channel ${channelId}, ${otherUsers.length} other users`);
  }

  /**
   * Ses kanalından ayrıl
   */
  @SubscribeMessage('leave-voice')
  async handleLeaveVoice(@ConnectedSocket() client: Socket) {
    await this.leaveVoiceChannel(client);
  }

  /**
   * Signaling mesajı
   */
  @SubscribeMessage('signal')
  handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: SignalingMessage,
  ) {
    const voiceUser = this.voiceUsers.get(client.id);
    if (!voiceUser) {
      return;
    }

    // Hedef kullanıcıyı bul
    let targetSocketId: string | null = null;
    
    for (const [socketId, user] of this.voiceUsers) {
      if (user.id === message.to && user.channelId === voiceUser.channelId) {
        targetSocketId = socketId;
        break;
      }
    }

    if (targetSocketId) {
      // Mesajı hedef kullanıcıya ilet
      this.server.to(targetSocketId).emit('signal', {
        ...message,
        from: voiceUser.id,
      });
      
      console.log(`[Voice] Signal ${message.type} from ${voiceUser.username} to ${message.to}`);
    } else {
      console.warn(`[Voice] Target user ${message.to} not found in channel`);
    }
  }

  /**
   * Mikrofon durumu değişikliği
   */
  @SubscribeMessage('toggle-mute')
  handleToggleMute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { muted: boolean },
  ) {
    const voiceUser = this.voiceUsers.get(client.id);
    if (!voiceUser) return;

    voiceUser.isMuted = data.muted;
    
    // Kanaldaki diğer kullanıcılara bildir
    client.to(`voice:${voiceUser.channelId}`).emit('user-muted', {
      userId: voiceUser.id,
      muted: data.muted,
    });

    console.log(`[Voice] ${voiceUser.username} ${data.muted ? 'muted' : 'unmuted'}`);
  }

  /**
   * Kulaklık durumu değişikliği
   */
  @SubscribeMessage('toggle-deafen')
  handleToggleDeafen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deafened: boolean },
  ) {
    const voiceUser = this.voiceUsers.get(client.id);
    if (!voiceUser) return;

    voiceUser.isDeafened = data.deafened;
    
    // Sağırlaştırıldığında mikrofon da kapatılır
    if (data.deafened) {
      voiceUser.isMuted = true;
    }

    // Kanaldaki diğer kullanıcılara bildir
    client.to(`voice:${voiceUser.channelId}`).emit('user-deafened', {
      userId: voiceUser.id,
      deafened: data.deafened,
      muted: voiceUser.isMuted,
    });

    console.log(`[Voice] ${voiceUser.username} ${data.deafened ? 'deafened' : 'undeafened'}`);
  }

  /**
   * Konuşma durumu değişikliği
   */
  @SubscribeMessage('speaking')
  handleSpeaking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { isSpeaking: boolean },
  ) {
    const voiceUser = this.voiceUsers.get(client.id);
    if (!voiceUser) return;

    // Kanaldaki diğer kullanıcılara bildir
    client.to(`voice:${voiceUser.channelId}`).emit('user-speaking', {
      userId: voiceUser.id,
      isSpeaking: data.isSpeaking,
    });

    console.log(`[Voice] ${voiceUser.username} ${data.isSpeaking ? 'started' : 'stopped'} speaking`);
  }

  /**
   * Ekran paylaşımı başladı
   */
  @SubscribeMessage('screen-share-started')
  handleScreenShareStarted(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; userId: string; username: string; hasAudio?: boolean },
  ) {
    const voiceUser = this.voiceUsers.get(client.id);
    if (!voiceUser) return;

    // State'i güncelle
    voiceUser.isScreenSharing = true;
    voiceUser.hasScreenAudio = !!data.hasAudio;

    console.log(`[Voice] ${data.username} started screen sharing in ${data.channelId}`);

    // Kanaldaki TÜME kullanıcılara broadcast et (kendisi dahil değil)
    client.to(`voice:${data.channelId}`).emit('screen-share-started', {
      userId: data.userId,
      username: data.username,
      channelId: data.channelId,
      hasAudio: !!data.hasAudio,
    });
  }

  /**
   * Ekran paylaşımı durdu
   */
  @SubscribeMessage('screen-share-stopped')
  handleScreenShareStopped(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; userId: string },
  ) {
    const voiceUser = this.voiceUsers.get(client.id);
    if (!voiceUser) return;

    // State'i güncelle
    voiceUser.isScreenSharing = false;
    voiceUser.hasScreenAudio = false;

    console.log(`[Voice] User ${data.userId} stopped screen sharing`);

    // Kanaldaki TÜME kullanıcılara broadcast et
    client.to(`voice:${data.channelId}`).emit('screen-share-stopped', {
      userId: data.userId,
      channelId: data.channelId,
    });
  }

  /**
   * Video başladı
   */
  @SubscribeMessage('video-started')
  handleVideoStarted(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; userId: string; username: string },
  ) {
    const voiceUser = this.voiceUsers.get(client.id);
    if (!voiceUser) return;

    // State'i güncelle
    voiceUser.isVideoOn = true;

    console.log(`[Voice] ${data.username} started video in ${data.channelId}`);

    // Kanaldaki diğer kullanıcılara broadcast et
    client.to(`voice:${data.channelId}`).emit('video-started', {
      userId: data.userId,
      username: data.username,
      channelId: data.channelId,
    });
  }

  /**
   * Video durdu
   */
  @SubscribeMessage('video-stopped')
  handleVideoStopped(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; userId: string },
  ) {
    const voiceUser = this.voiceUsers.get(client.id);
    if (!voiceUser) return;

    // State'i güncelle
    voiceUser.isVideoOn = false;

    console.log(`[Voice] User ${data.userId} stopped video`);

    // Kanaldaki diğer kullanıcılara broadcast et
    client.to(`voice:${data.channelId}`).emit('video-stopped', {
      userId: data.userId,
      channelId: data.channelId,
    });
  }

  /**
   * Ses istatistikleri
   */
  @SubscribeMessage('voice-stats')
  handleVoiceStats(
    @ConnectedSocket() client: Socket,
    @MessageBody() stats: any,
  ) {
    const voiceUser = this.voiceUsers.get(client.id);
    if (!voiceUser) return;

    // İstatistikleri Redis'e kaydet (opsiyonel)
    // this.redis.setVoiceStats(voiceUser.id, stats);

    // Admin'lere istatistikleri gönder (opsiyonel)
    // this.server.to('admins').emit('user-voice-stats', {
    //   userId: voiceUser.id,
    //   stats,
    // });
  }

  /**
   * Ses kanalından çıkma işlemi
   */
  private async leaveVoiceChannel(client: Socket): Promise<void> {
    const voiceUser = this.voiceUsers.get(client.id);
    if (!voiceUser) return;

    const { channelId, id: userId, username } = voiceUser;

    // Kanaldan çıkar
    const channelUsers = this.voiceChannels.get(channelId);
    if (channelUsers) {
      channelUsers.delete(client.id);
      if (channelUsers.size === 0) {
        this.voiceChannels.delete(channelId);
      }
    }

    // Socket.io odasından çık
    await client.leave(`voice:${channelId}`);

    // Kullanıcıyı sil
    this.voiceUsers.delete(client.id);

    // Diğer kullanıcılara bildir
    client.to(`voice:${channelId}`).emit('peer-left', {
      peerId: userId,
      username,
    });

    // Kanaldaki kullanıcı sayısını güncelle
    this.broadcastChannelUpdate(channelId);

    console.log(`[Voice] ${username} left channel ${channelId}`);
  }

  /**
   * Kanal güncellemelerini yayınla
   */
  private broadcastChannelUpdate(channelId: string): void {
    const channelUsers = this.voiceChannels.get(channelId);
    const userCount = channelUsers ? channelUsers.size : 0;
    
    const users: any[] = [];
    if (channelUsers) {
      for (const socketId of channelUsers) {
        const user = this.voiceUsers.get(socketId);
        if (user) {
          users.push({
            id: user.id,
            username: user.username,
            isMuted: user.isMuted,
            isDeafened: user.isDeafened,
            hasScreenAudio: user.hasScreenAudio || false,
          });
        }
      }
    }

    // Tüm kullanıcılara kanal durumunu gönder
    this.server.emit('voice-channel-update', {
      channelId,
      userCount,
      users,
    });
  }

  /**
   * ICE sunucularını al
   */
  private getIceServers(): RTCIceServer[] {
    const servers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    // TURN sunucusu varsa ekle
    if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_PASSWORD) {
      servers.push({
        urls: process.env.TURN_URL,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD,
      });
    }

    return servers;
  }
}
