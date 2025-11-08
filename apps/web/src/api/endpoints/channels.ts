import { axiosInstance } from '../axios';

export const channelsApi = {
  // Get channels by server
  getByServer: async (serverId: string) => {
    return await axiosInstance.get(`/channels/server/${serverId}`);
  },

  // Create channel
  create: async (serverId: string, data: { name: string; type: 'TEXT' | 'VOICE'; description?: string }) => {
    return await axiosInstance.post(`/channels/server/${serverId}`, data);
  },

  // Update channel
  update: async (channelId: string, data: { name?: string; description?: string }) => {
    return await axiosInstance.patch(`/channels/${channelId}`, data);
  },

  // Delete channel
  delete: async (channelId: string) => {
    return await axiosInstance.delete(`/channels/${channelId}`);
  },
};

