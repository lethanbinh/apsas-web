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

// Interface cho API /Semester (trả về mảng)
interface RawSemesterApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: string[];
  result: Semester[]; 
}

// Interface cho API /AssessmentTemplate/list (trả về object phân trang)
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

  async downloadExcelTemplate(): Promise<Blob> {
    const response = await apiService.get(API_ENDPOINTS.IMPORT.EXCEL_TEMPLATE, {
      responseType: 'blob',
    });
    return response as Blob;
  }
  
  // HÀM ĐÚNG CHO SEMESTERPLANS (trả về mảng)
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

  // --- CÁC HÀM CHO HOD ---

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

  // HÀM MỚI (trả về object phân trang)
  async getAssessmentTemplateList(pageNumber: number = 1, pageSize: number = 100): Promise<PaginatedResponse<ApiAssessmentTemplate>> {
    console.log("Fetching template list...");
    const response = await apiService.get<RawTemplateListResponse>( // Dùng RawTemplateListResponse
      `${API_ENDPOINTS.HOD.ASSESSMENT_TEMPLATE_LIST}?pageNumber=${pageNumber}&pageSize=${pageSize}`
    );

    if (!response.isSuccess || !response.result || !Array.isArray(response.result.items)) {
      console.error("Failed to fetch assessment templates or invalid data structure:", response);
      throw new Error("Failed to fetch assessment templates or invalid data structure.");
    }
    
    console.log(`Found ${response.result.items.length} templates`);
    return response.result;
  }
  
  // HÀM MỚI
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

  // HÀM MỚI
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

export const adminService = new AdminService();