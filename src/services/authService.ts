

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


    const response = await apiService.post<{ token: string }>(API_ENDPOINTS.AUTH.REFRESH);
    return response;
  }

  async getProfile(): Promise<User> {

    const userId = typeof window !== 'undefined' ? sessionStorage.getItem('user_id') : null;

    if (!userId) {
      console.error('❌ No user_id in sessionStorage');
      throw new Error('User ID not found in storage. Please login again.');
    }

    console.log('🔍 Fetching user profile by ID:', userId);


    const response = await apiService.get<any>(`${API_ENDPOINTS.USER.GET_BY_ID}/${userId}`);
    console.log('📥 Profile response:', response);


    let userData;
    if (response.result) {
      userData = response.result as User;
      console.log('✅ Extracted user from result');
    } else {
      userData = response as User;
      console.log('✅ Using response as user');
    }


    if (typeof window !== 'undefined') {
      sessionStorage.setItem('user_data', JSON.stringify(userData));
      console.log('✅ User data cached to sessionStorage');
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
    try {
      const response = await apiService.put<any>(`${API_ENDPOINTS.ACCOUNT.UPDATE_PROFILE}/${id}`, data);


      if (response?.result) {
        return response.result as User;
      }
      if (response && typeof response === 'object' && 'id' in response) {
        return response as User;
      }


      throw new Error('Invalid response format from update profile API');
    } catch (error: any) {

      if (error?.response) {

        throw error;
      }

      throw new Error(error?.message || 'Failed to update profile');
    }
  }

  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiService.post<{
      statusCode: number;
      isSuccess: boolean;
      errorMessages: string[];
      result: {
        fileName: string;
        fileUrl: string;
        fileSize: number;
        contentType: string;
        uploadedAt: string;
      };
    }>(API_ENDPOINTS.FILE.UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.isSuccess && response.result) {
      return response.result.fileUrl;
    }
    throw new Error(response.errorMessages?.join(', ') || 'Failed to upload avatar');
  }
}

export const authService = new AuthService();
