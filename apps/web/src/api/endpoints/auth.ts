import { axiosInstance } from '../axios';
import { User } from '../../store/auth.store';

export interface LoginRequest {
  identifier: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  captchaToken?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface TwoFactorResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  createdAt?: string;
}

export const authApi = {
  // Register
  register: async (data: RegisterRequest) => {
    return await axiosInstance.post('/auth/register', data);
  },

  // Login
  login: async (data: LoginRequest) => {
    return await axiosInstance.post('/auth/login', data);
  },

  // Logout
  logout: async () => {
    return await axiosInstance.post('/auth/logout');
  },

  // Refresh token
  refreshToken: async (refreshToken: string) => {
    return await axiosInstance.post('/auth/refresh', { refreshToken });
  },

  // Verify email
  verifyEmail: async (token: string) => {
    return await axiosInstance.post('/auth/verify-email', { token });
  },

  // Resend verification email
  resendVerificationEmail: async () => {
    return await axiosInstance.post('/auth/resend-verification');
  },

  // Forgot password
  forgotPassword: async (email: string) => {
    return await axiosInstance.post('/auth/forgot-password', { email });
  },

  // Reset password
  resetPassword: async (token: string, password: string) => {
    return await axiosInstance.post('/auth/reset-password', { token, newPassword: password });
  },

  // Get current user
  getCurrentUser: async () => {
    return await axiosInstance.get('/auth/me');
  },

  // 2FA APIs
  generate2FA: async () => {
    return await axiosInstance.post<TwoFactorResponse>('/auth/2fa/generate');
  },

  enable2FA: async (code: string) => {
    return await axiosInstance.post('/auth/2fa/enable', { code });
  },

  disable2FA: async () => {
    return await axiosInstance.post('/auth/2fa/disable');
  },

  verify2FA: async (code: string) => {
    return await axiosInstance.post('/auth/2fa/verify', { code });
  },

  regenerateBackupCodes: async () => {
    return await axiosInstance.post('/auth/2fa/regenerate-backup-codes');
  },

  get2FAStatus: async () => {
    return await axiosInstance.get<TwoFactorStatusResponse>('/auth/2fa/status');
  },
};
