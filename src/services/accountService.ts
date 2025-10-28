/**
 * Account service
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '@/lib/constants';
import { User, AccountListResponse } from '@/types'; // Use AccountListResponse

interface GetAccountListResponse {
  users: User[];
  total: number;
}

export class AccountService {
  async getAccountList(pageNumber: number, pageSize: number): Promise<GetAccountListResponse> {
    const response = await apiService.get<AccountListResponse>(
      `${API_ENDPOINTS.ACCOUNT.PAGINATED_LIST}?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
    return { users: response.result.items, total: response.result.totalCount };
  }

  async deleteAccount(id: number): Promise<void> {
    await apiService.delete(`${API_ENDPOINTS.ADMIN.DELETE}/${id}`);
  }

  async updateAccount(id: number, userData: any): Promise<void> {
    await apiService.patch(`${API_ENDPOINTS.ACCOUNT.UPDATE_PROFILE}/${id}/profile`, userData);
  }

  async createAccount(newUserData: any): Promise<void> {
    await apiService.post(API_ENDPOINTS.ADMIN.CREATE, newUserData);
  }
}

export const accountService = new AccountService();
