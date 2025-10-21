/**
 * Authentication service
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '@/lib/constants';
import { LoginCredentials, RegisterData, User } from '@/types';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await apiService.post<{ user: User; token: string }>(API_ENDPOINTS.AUTH.LOGIN, credentials);
    return response;
  }

  async register(data: RegisterData): Promise<{ user: User; token: string }> {
    const response = await apiService.post<{ user: User; token: string }>(API_ENDPOINTS.AUTH.REGISTER, data);
    return response;
  }

  async logout(): Promise<void> {
    // No backend endpoint for logout, so just return a resolved promise.
    return Promise.resolve();
  }

  async refreshToken(): Promise<{ token: string }> {
    // This method is not actively used for automatic refresh without a backend endpoint.
    // Keeping it for potential future use or if backend implements it later.
    const response = await apiService.post<{ token: string }>(API_ENDPOINTS.AUTH.REFRESH);
    return response;
  }

  async getProfile(): Promise<User> {
    const response = await apiService.get<User>(API_ENDPOINTS.USER.PROFILE);
    return response;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiService.put<User>(API_ENDPOINTS.USER.UPDATE, data);
    return response;
  }
}

export const authService = new AuthService();
