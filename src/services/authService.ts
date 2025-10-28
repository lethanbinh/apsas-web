/**
 * Authentication service
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '@/lib/constants';
import { LoginCredentials, RegisterData, User, ForgotPasswordRequest, VerifyOtpRequest, ResetPasswordRequest, GoogleLoginRequest, GoogleLoginResponse } from '@/types';
import { config } from '@/lib/config';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<any> {
    const response = await apiService.post<any>(API_ENDPOINTS.AUTH.LOGIN, credentials);
    console.log('🔍 AuthService login response:', response);
    console.log('🔍 Response structure:', JSON.stringify(response, null, 2));
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

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
  }

  async verifyOtp(data: VerifyOtpRequest): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH.VERIFY_OTP, data);
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, data);
  }

  async googleLogin(data: { idToken: string }): Promise<GoogleLoginResponse> {
    const response = await apiService.post<GoogleLoginResponse>(API_ENDPOINTS.AUTH.GOOGLE, {
      idToken: data.idToken,
    });
    return response;
  }

  async refreshToken(): Promise<{ token: string }> {
    // This method is not actively used for automatic refresh without a backend endpoint.
    // Keeping it for potential future use or if backend implements it later.
    const response = await apiService.post<{ token: string }>(API_ENDPOINTS.AUTH.REFRESH);
    return response;
  }

  async getProfile(): Promise<User> {
    // Get user ID from localStorage
    const userId = localStorage.getItem('user_id');
    
    if (!userId) {
      console.error('❌ No user_id in localStorage');
      throw new Error('User ID not found in storage. Please login again.');
    }
    
    console.log('🔍 Fetching user profile by ID:', userId);
    
    // Call the correct API endpoint: /Account/{id}
    const response = await apiService.get<any>(`${API_ENDPOINTS.USER.GET_BY_ID}/${userId}`);
    console.log('📥 Profile response:', response);
    
    // Extract user from result
    let userData;
    if (response.result) {
      userData = response.result as User;
      console.log('✅ Extracted user from result');
    } else {
      userData = response as User;
      console.log('✅ Using response as user');
    }
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_data', JSON.stringify(userData));
      console.log('✅ User data cached to localStorage');
    }
    
    return userData;
  }

  async updateProfile(id: number, data: {
    phoneNumber: string;
    fullName: string;
    avatar: string;
    address: string;
    gender: number;
    dateOfBirth: string;
  }): Promise<User> {
    const response = await apiService.put<any>(`${API_ENDPOINTS.ACCOUNT.UPDATE_PROFILE}/${id}`, data);
    
    // Extract user from result
    if (response.result) {
      return response.result as User;
    }
    return response as User;
  }
}

export const authService = new AuthService();
