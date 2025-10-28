/**
 * Account service
 */

import { apiService } from './api';
import { API_ENDPOINTS } from '@/lib/constants';
import { User, AccountListResponse, PaginatedResponse, Semester } from '@/types';

interface GetAccountListResponse {
  users: User[];
  total: number;
}

// Interface for the raw Semester API response
interface RawSemesterApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: string[];
  result: Semester[]; // The array of semesters is directly in 'result'
}

export class AdminService {
  async getAccountList(pageNumber: number, pageSize: number): Promise<GetAccountListResponse> {
    const response = await apiService.get<AccountListResponse>(
      `${API_ENDPOINTS.ACCOUNT.PAGINATED_LIST}?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
    return { users: response.result.items, total: response.result.totalCount };
  }

  async deleteAccount(id: number): Promise<void> {
    await apiService.delete(`${API_ENDPOINTS.ADMIN.DELETE}/${id}`);
  }

  async updateAccount(id: number, userData: any): Promise<User> {
    const response = await apiService.patch<any>(
      `${API_ENDPOINTS.ACCOUNT.UPDATE_PROFILE}/${id}/profile`,
      userData
    );
    
    // Extract user from result
    if (response.result) {
      return response.result as User;
    }
    return response as User;
  }

  async createAccount(newUserData: any): Promise<void> {
    await apiService.post(API_ENDPOINTS.ADMIN.CREATE, newUserData);
  }

  async downloadExcelTemplate(): Promise<Blob> {
    const response = await apiService.get(API_ENDPOINTS.IMPORT.EXCEL_TEMPLATE, {
      responseType: 'blob', // Important for file downloads
    });
    return response as Blob;
  }

  async getPaginatedSemesters(pageNumber: number, pageSize: number): Promise<Semester[]> {
    const response = await apiService.get<RawSemesterApiResponse>(
      `${API_ENDPOINTS.SEMESTER.PAGINATED_LIST}?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
    console.log("Raw API response in getPaginatedSemesters:", response); // Keep for now
    return response.result;
  }

  async uploadSemesterCourseData(semester: string, formData: FormData): Promise<any> {
    const response = await apiService.post(
      `${API_ENDPOINTS.IMPORT.SEMESTER_COURSE_DATA}?semester=${semester}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response;
  }

  async uploadClassStudentData(semester: string, formData: FormData): Promise<any> {
    const response = await apiService.post(
      `${API_ENDPOINTS.IMPORT.CLASS_STUDENT_DATA}?semester=${semester}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response;
  }
}

export const adminService = new AdminService();
