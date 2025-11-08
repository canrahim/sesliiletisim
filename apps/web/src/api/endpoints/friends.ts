import { axiosInstance } from '../axios';

export const friendsApi = {
  // Get all friends
  getAll: async () => {
    return await axiosInstance.get('/friends');
  },

  // Get pending requests
  getPendingRequests: async () => {
    return await axiosInstance.get('/friends/requests');
  },

  // Send friend request
  sendRequest: async (username: string) => {
    return await axiosInstance.post('/friends/request', { username });
  },

  // Accept friend request
  acceptRequest: async (requestId: string) => {
    return await axiosInstance.post(`/friends/${requestId}/accept`);
  },

  // Decline friend request
  declineRequest: async (requestId: string) => {
    return await axiosInstance.delete(`/friends/${requestId}/decline`);
  },

  // Remove friend
  removeFriend: async (friendId: string) => {
    return await axiosInstance.delete(`/friends/${friendId}`);
  },

  // Block user
  blockUser: async (userId: string) => {
    return await axiosInstance.post(`/friends/${userId}/block`);
  },
};

