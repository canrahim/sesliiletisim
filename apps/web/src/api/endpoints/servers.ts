import { axiosInstance } from '../axios';

export const serversApi = {
  // Get all servers
  getAll: async () => {
    return await axiosInstance.get('/servers');
  },

  // Get server by ID
  getById: async (serverId: string) => {
    return await axiosInstance.get(`/servers/${serverId}`);
  },

  // Create server
  create: async (data: { name: string; description?: string; icon?: string }) => {
    return await axiosInstance.post('/servers', data);
  },

  // Update server
  update: async (serverId: string, data: { name?: string; description?: string; icon?: string }) => {
    return await axiosInstance.patch(`/servers/${serverId}`, data);
  },

  // Delete server
  delete: async (serverId: string) => {
    return await axiosInstance.delete(`/servers/${serverId}`);
  },

  // Create invite
  createInvite: async (serverId: string, data?: { maxUses?: number; expiresInDays?: number }) => {
    return await axiosInstance.post(`/servers/${serverId}/invite`, data || {});
  },

  // Join by invite
  joinByInvite: async (inviteCode: string) => {
    return await axiosInstance.post(`/servers/join/${inviteCode}`);
  },

  // Get server members
  getMembers: async (serverId: string) => {
    return await axiosInstance.get(`/servers/${serverId}/members`);
  },

  // Update member role
  updateMemberRole: async (serverId: string, memberId: string, role: string) => {
    return await axiosInstance.patch(`/servers/${serverId}/members/${memberId}/role`, { role });
  },

  // Remove/kick member
  removeMember: async (serverId: string, memberId: string) => {
    return await axiosInstance.delete(`/servers/${serverId}/members/${memberId}`);
  },

  // Leave server
  leave: async (serverId: string) => {
    return await axiosInstance.post(`/servers/${serverId}/leave`);
  },
};

