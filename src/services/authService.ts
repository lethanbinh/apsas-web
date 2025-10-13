/**
 * Authentication service
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '@/lib/constants';
import { LoginCredentials, RegisterData, User } from '@/types';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await apiService.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    return response;
  }

  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    const response = await apiService.post(API_ENDPOINTS.AUTH.REGISTER, data);
    return response;
  }

  async logout(): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH.LOGOUT);
  }

  async refreshToken(): Promise<{ token: string }> {
    const response = await apiService.post(API_ENDPOINTS.AUTH.REFRESH);
    return response;
  }

  async getProfile(): Promise<User> {
    const response = await apiService.get(API_ENDPOINTS.USER.PROFILE);
    return response;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiService.put(API_ENDPOINTS.USER.UPDATE, data);
    return response;
  }
}

export const authService = new AuthService();
