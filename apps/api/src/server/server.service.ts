import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from '../presence/presence.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { AddMemberDto, CreateInviteDto } from './dto/server-member.dto';
import { UserRole } from '@prisma/client';
import { nanoid } from 'nanoid';

@Injectable()
export class ServerService {
  constructor(
    private prisma: PrismaService,
    private presenceService: PresenceService,
  ) {}

  async create(userId: string, createServerDto: CreateServerDto) {
    const server = await this.prisma.server.create({
      data: {
        name: createServerDto.name,
        description: createServerDto.description,
        icon: createServerDto.iconUrl,
        ownerId: userId,
        inviteCode: nanoid(8),
        members: {
          create: {
            userId,
            role: UserRole.OWNER,
          },
        },
        channels: {
          create: [
            { name: 'general', type: 'TEXT' },
            { name: 'voice', type: 'VOICE' },
            ...(createServerDto.defaultChannels?.map(name => ({
              name,
              type: 'TEXT' as const,
            })) || []),
          ],
        },
      },
      include: {
        channels: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return server;
  }

  async findAll(userId: string) {
    const servers = await this.prisma.server.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        channels: {
          take: 5,
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            members: true,
            channels: true,
          },
        },
      },
    });

    return servers;
  }

  async findOne(id: string, userId: string) {
    const server = await this.prisma.server.findFirst({
      where: {
        id,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        channels: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
                isOnline: true,
              },
            },
          },
          orderBy: {
            role: 'asc',
          },
        },
      },
    });

    if (!server) {
      throw new NotFoundException('Server not found or you are not a member');
    }

    // Get real-time online status from Redis for all members
    const memberUserIds = server.members.map(m => m.user.id);
    const onlineStatuses = await Promise.all(
      memberUserIds.map(async (uid) => {
        const isOnline = await this.presenceService.isUserOnline(uid);
        return { userId: uid, isOnline };
      })
    );

    // Update members with real-time online status
    server.members = server.members.map(member => ({
      ...member,
      user: {
        ...member.user,
        isOnline: onlineStatuses.find(s => s.userId === member.user.id)?.isOnline || false,
      },
    }));

    return server;
  }

  async update(id: string, userId: string, updateServerDto: UpdateServerDto) {
    // Check if user is admin or owner
    const member = await this.getMember(id, userId);
    if (!this.canManageServer(member.role)) {
      throw new ForbiddenException('You do not have permission to update this server');
    }

    const server = await this.prisma.server.update({
      where: { id },
      data: updateServerDto,
      include: {
        channels: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return server;
  }

  async remove(id: string, userId: string) {
    // Check if user is owner
    const member = await this.getMember(id, userId);
    if (member.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only the owner can delete the server');
    }

    await this.prisma.server.delete({
      where: { id },
    });

    return { message: 'Server deleted successfully' };
  }

  async joinByInvite(inviteCode: string, userId: string) {
    // Find the invite first
    const invite = await this.prisma.serverInvite.findUnique({
      where: { code: inviteCode },
      include: { server: true },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite code');
    }

    // Check if invite is expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invite code has expired');
    }

    // Check if invite has reached max uses
    if (invite.maxUses && invite.uses >= invite.maxUses) {
      throw new ForbiddenException('Invite code has reached maximum uses');
    }

    const server = invite.server;

    // Check if already a member
    const existingMember = await this.prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId: server.id,
          userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this server');
    }

    // Add member
    const member = await this.prisma.serverMember.create({
      data: {
        serverId: server.id,
        userId,
        role: 'MEMBER',
      },
      include: {
        server: {
          include: {
            channels: true,
          },
        },
      },
    });

    // Update invite usage count
    await this.prisma.serverInvite.update({
      where: { code: inviteCode },
      data: { uses: { increment: 1 } },
    });

    return member.server;
  }

  async leave(id: string, userId: string) {
    const member = await this.getMember(id, userId);
    
    if (member.role === UserRole.OWNER) {
      throw new ForbiddenException('Owner cannot leave the server. Transfer ownership first or delete the server.');
    }

    await this.prisma.serverMember.delete({
      where: {
        serverId_userId: {
          serverId: id,
          userId,
        },
      },
    });

    return { message: 'Left server successfully' };
  }

  async addMember(serverId: string, adminId: string, addMemberDto: AddMemberDto) {
    // Check admin permissions
    const adminMember = await this.getMember(serverId, adminId);
    if (!this.canManageMembers(adminMember.role)) {
      throw new ForbiddenException('You do not have permission to add members');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId: addMemberDto.userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this server');
    }

    const member = await this.prisma.serverMember.create({
      data: {
        serverId,
        userId: addMemberDto.userId,
        role: addMemberDto.role || UserRole.MEMBER,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    return member;
  }

  async getMembers(serverId: string, userId: string) {
    // Verify user is a member
    await this.getMember(serverId, userId);

    // Get all members
    const members = await this.prisma.serverMember.findMany({
      where: { serverId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        role: 'asc',
      },
    });

    // Get real-time online status from Redis for all members
    const memberUserIds = members.map(m => m.user.id);
    const onlineStatuses = await Promise.all(
      memberUserIds.map(async (uid) => {
        const isOnline = await this.presenceService.isUserOnline(uid);
        return { userId: uid, isOnline };
      })
    );

    // Add isOnline field to each member
    const membersWithPresence = members.map(member => ({
      ...member,
      user: {
        ...member.user,
        isOnline: onlineStatuses.find(s => s.userId === member.user.id)?.isOnline || false,
      },
    }));

    return membersWithPresence;
  }

  async removeMember(serverId: string, adminId: string, memberId: string) {
    // Check admin permissions
    const adminMember = await this.getMember(serverId, adminId);
    if (!this.canManageMembers(adminMember.role)) {
      throw new ForbiddenException('You do not have permission to remove members');
    }

    // Check target member
    const targetMember = await this.getMember(serverId, memberId);
    
    // Cannot remove owner
    if (targetMember.role === UserRole.OWNER) {
      throw new ForbiddenException('Cannot remove the server owner');
    }

    // Check role hierarchy
    if (!this.canManageRole(adminMember.role, targetMember.role)) {
      throw new ForbiddenException('You cannot remove a member with equal or higher role');
    }

    await this.prisma.serverMember.delete({
      where: {
        serverId_userId: {
          serverId,
          userId: memberId,
        },
      },
    });

    return { message: 'Member removed successfully' };
  }

  async updateMemberRole(serverId: string, adminId: string, memberId: string, newRole: UserRole) {
    // Check admin permissions
    const adminMember = await this.getMember(serverId, adminId);
    if (!this.canManageRoles(adminMember.role)) {
      throw new ForbiddenException('You do not have permission to manage roles');
    }

    // Cannot change owner role
    const targetMember = await this.getMember(serverId, memberId);
    if (targetMember.role === UserRole.OWNER) {
      throw new ForbiddenException('Cannot change the owner role');
    }

    // Check role hierarchy
    if (!this.canManageRole(adminMember.role, newRole)) {
      throw new ForbiddenException('You cannot assign a role equal or higher than your own');
    }

    const member = await this.prisma.serverMember.update({
      where: {
        serverId_userId: {
          serverId,
          userId: memberId,
        },
      },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    return member;
  }

  async generateInvite(serverId: string, userId: string, createInviteDto: CreateInviteDto) {
    // Check permissions
    const member = await this.getMember(serverId, userId);
    if (!this.canInvite(member.role)) {
      throw new ForbiddenException('You do not have permission to create invites');
    }

    // Calculate expiration if specified
    const expiresAt = createInviteDto.expiresIn 
      ? new Date(Date.now() + createInviteDto.expiresIn * 60 * 60 * 1000) // hours to milliseconds
      : null;

    // Create new server invite
    const invite = await this.prisma.serverInvite.create({
      data: {
        serverId,
        code: nanoid(8),
        maxUses: createInviteDto.maxUses || null,
        expiresAt,
        createdBy: userId,
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      inviteCode: invite.code,
      inviteUrl: `/invite/${invite.code}`,
      maxUses: invite.maxUses,
      expiresAt: invite.expiresAt,
      server: invite.server,
    };
  }

  // Helper methods
  private async getMember(serverId: string, userId: string) {
    const member = await this.prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this server');
    }

    return member;
  }

  private canManageServer(role: string): boolean {
    return ([UserRole.OWNER, UserRole.ADMIN] as string[]).includes(role);
  }

  private canManageMembers(role: string): boolean {
    return ([UserRole.OWNER, UserRole.ADMIN, UserRole.MODERATOR] as string[]).includes(role);
  }

  private canManageRoles(role: string): boolean {
    return ([UserRole.OWNER, UserRole.ADMIN] as string[]).includes(role);
  }

  private canInvite(role: string): boolean {
    // Tüm sunucu üyeleri davet linki oluşturabilir
    return ([UserRole.OWNER, UserRole.ADMIN, UserRole.MODERATOR, UserRole.MEMBER] as string[]).includes(role);
  }

  private canManageRole(adminRole: string, targetRole: string): boolean {
    const roleHierarchy = {
      [UserRole.OWNER]: 4,
      [UserRole.ADMIN]: 3,
      [UserRole.MODERATOR]: 2,
      [UserRole.MEMBER]: 1,
    };

    return roleHierarchy[adminRole] > roleHierarchy[targetRole];
  }
}
