import { apiService } from './api';
import { API_ENDPOINTS } from '@/lib/constants';
import {
  User,
  AccountListResponse,
  PaginatedResponse,
  Semester,
  ApiApprovalItem,
  ApprovalListResponse,
  AssessmentTemplateListResponse,
  AssessmentTemplateDetailResponse,
  RubricItemListResponse,
  ApiAssessmentTemplate,
  ApiRubricItem,
  ApiAssignRequestUpdatePayload
} from '@/types';

interface GetAccountListResponse {
  users: User[];
  total: number;
}


interface RawSemesterApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: string[];
  result: Semester[];
}


interface RawTemplateListResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: string[];
  result: PaginatedResponse<ApiAssessmentTemplate>;
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

    if (response.result) {
      return response.result as User;
    }
    return response as User;
  }

  async createAccount(newUserData: any): Promise<void> {
    await apiService.post(API_ENDPOINTS.ADMIN.CREATE, newUserData);
  }

  async createAdmin(payload: CreateAdminPayload): Promise<any> {
    const response = await apiService.post("/Admin/create", payload);
    return response;
  }

  async createHOD(payload: CreateHODPayload): Promise<any> {
    const response = await apiService.post("/HoD/create", payload);
    return response;
  }

  async downloadExcelTemplate(): Promise<Blob> {
    const response = await apiService.get(API_ENDPOINTS.IMPORT.EXCEL_TEMPLATE, {
      responseType: 'blob',
    });
    return response as Blob;
  }

  async downloadClassStudentTemplate(): Promise<Blob> {
    const response = await apiService.get(API_ENDPOINTS.IMPORT.CLASS_STUDENT_TEMPLATE, {
      responseType: 'blob',
    });
    return response as Blob;
  }

  async getPaginatedSemesters(pageNumber: number, pageSize: number): Promise<Semester[]> {
    const response = await apiService.get<RawSemesterApiResponse>(
      `${API_ENDPOINTS.SEMESTER.PAGINATED_LIST}?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );

    if (response && response.result && Array.isArray(response.result)) {
       console.log("Fetched paginated semesters, returning items array:", response.result);
       return response.result;
    }

    console.warn("Unexpected semester response structure, returning empty array.");
    return [];
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

  async uploadClassStudentData(semester: string, semesterCourseId: number, formData: FormData): Promise<any> {
    const response = await apiService.post(
      `${API_ENDPOINTS.IMPORT.CLASS_STUDENT_DATA}?semester=${semester}&semesterCourseId=${semesterCourseId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response;
  }



  async getApprovalList(pageNumber: number, pageSize: number): Promise<PaginatedResponse<ApiApprovalItem>> {
    const response = await apiService.get<ApprovalListResponse>(
      `${API_ENDPOINTS.HOD.APPROVAL_LIST}?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );

    if (response && response.result && Array.isArray(response.result.items)) {
      return response.result;
    }

    console.error("Unexpected API response structure in getApprovalList:", response);
    throw new Error("Invalid data structure received from server.");
  }


  async getAssessmentTemplateList(pageNumber: number = 1, pageSize: number = 100): Promise<PaginatedResponse<ApiAssessmentTemplate>> {
    console.log("Fetching template list...");
    const response = await apiService.get<RawTemplateListResponse>(
      `${API_ENDPOINTS.HOD.ASSESSMENT_TEMPLATE_LIST}?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );

    if (!response.isSuccess || !response.result || !Array.isArray(response.result.items)) {
      console.error("Failed to fetch assessment templates or invalid data structure:", response);
      throw new Error("Failed to fetch assessment templates or invalid data structure.");
    }

    console.log(`Found ${response.result.items.length} templates`);
    return response.result;
  }


  async getRubricItemsByQuestionId(questionId: number): Promise<ApiRubricItem[]> {
    console.log(`Fetching rubrics for questionId: ${questionId}`);
    const response = await apiService.get<RubricItemListResponse>(
      `${API_ENDPOINTS.HOD.RUBRIC_ITEM_BY_QUESTION}/${questionId}`
    );

    if (response && response.isSuccess && Array.isArray(response.result)) {
       console.log(`Found ${response.result.length} rubrics for question ${questionId}`);
      return response.result;
    }

    if (!response.isSuccess) {
      console.error("API error fetching rubrics:", response.errorMessages);
    }
    return [];
  }


  async updateAssignRequestStatus(
    assignRequestId: number,
    payload: ApiAssignRequestUpdatePayload
  ): Promise<void> {
    console.log(`Updating AssignRequest ${assignRequestId} with status: ${payload.status}`);
    await apiService.put(
      `${API_ENDPOINTS.HOD.ASSIGN_REQUEST_UPDATE}/${assignRequestId}`,
      payload
    );
  }
}

export interface CreateAdminPayload {
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  fullName: string;
  avatar?: string;
  address: string;
  gender: number;
  dateOfBirth: string;
}

export interface CreateHODPayload {
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  fullName: string;
  avatar?: string;
  address: string;
  gender: number;
  dateOfBirth: string;
}

export const adminService = new AdminService();