import { axiosInstance } from '../axios';

export const messagesApi = {
  // Get messages by channel
  getChannelMessages: async (channelId: string, limit = 50) => {
    return await axiosInstance.get(`/messages/channel/${channelId}`, {
      params: { limit },
    });
  },

  // Send message
  sendMessage: async (channelId: string, content: string) => {
    return await axiosInstance.post(`/messages/channel/${channelId}`, {
      content,
    });
  },

  // Delete message
  deleteMessage: async (messageId: string) => {
    return await axiosInstance.delete(`/messages/${messageId}`);
  },

  // Edit message
  editMessage: async (messageId: string, content: string) => {
    return await axiosInstance.patch(`/messages/${messageId}`, {
      content,
    });
  },
};

