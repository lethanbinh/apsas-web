

import { apiService } from './api';
import { API_ENDPOINTS } from '@/lib/constants';
import { User, AccountListResponse } from '@/types';

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
    await apiService.delete(`${API_ENDPOINTS.ACCOUNT.UPDATE_PROFILE}/${id}`);
  }

  async updateAccount(id: number, userData: any): Promise<void> {
    await apiService.patch(`${API_ENDPOINTS.ACCOUNT.UPDATE_PROFILE}/${id}/profile`, userData);
  }

  async createAccount(newUserData: any): Promise<void> {
    await apiService.post(API_ENDPOINTS.ADMIN.CREATE, newUserData);
  }


  async checkEmailExists(email: string): Promise<boolean> {
    try {

      const pageSize = 1000;
      let pageNumber = 1;
      let found = false;
      let total = 0;

      do {
        const response = await this.getAccountList(pageNumber, pageSize);
        total = response.total;


        const emailLower = email.toLowerCase().trim();
        found = response.users.some(
          (user) => user.email?.toLowerCase().trim() === emailLower
        );

        if (found) {
          return true;
        }



        if (!found && total > pageNumber * pageSize && pageNumber < 5) {
          pageNumber++;
        } else {
          break;
        }
      } while (!found && pageNumber * pageSize < total);

      return found;
    } catch (error) {
      console.error("Error checking email existence:", error);


      return false;
    }
  }
}

export const accountService = new AccountService();
