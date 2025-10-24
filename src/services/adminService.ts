/**
 * Account service
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '@/lib/constants';
import { User, AccountListResponse, PaginatedResponse } from '@/types';

interface GetAccountListResponse {
  users: User[];
  total: number;
}

export class AdminService {
  async getAccountList(pageNumber: number, pageSize: number): Promise<GetAccountListResponse> {
    const response = await apiService.get<AccountListResponse>(
      `${API_ENDPOINTS.ADMIN.PAGINATED_LIST}?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
    return { users: response.result.items, total: response.result.totalCount };
  }

  async deleteAccount(id: number): Promise<void> {
    await apiService.delete(`${API_ENDPOINTS.ADMIN.DELETE}/${id}`);
  }

  async updateAccount(id: number, userData: any): Promise<void> {
    await apiService.put(`${API_ENDPOINTS.ADMIN.UPDATE}/${id}`, userData);
  }

  async createAccount(newUserData: any): Promise<void> {
    await apiService.post(API_ENDPOINTS.ADMIN.CREATE, newUserData);
  }
}

export const adminService = new AdminService();
