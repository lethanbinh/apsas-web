import { apiService } from "./api";
export interface ExamSessionStudent {
  studentId: number;
  studentName: string;
  studentCode: string;
}

export interface ExamSession {
  id: number;
  classId: number;
  assessmentTemplateId: number;
  assessmentTemplateName: string;
  assessmentTemplateDescription: string;
  courseElementId: number;
  courseElementName: string;
  startAt: string;
  endAt: string;
  createdAt: string;
  updatedAt: string;
  enrollmentCode: string;
  classCode: string;
  courseName: string;
  lecturerName: string;
  students: ExamSessionStudent[];
  submissionCount: string;
  status: number;
}

export interface ExamSessionApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: ExamSession;
}

export interface ExamSessionListResult {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: ExamSession[];
}

export interface ExamSessionListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: ExamSessionListResult;
}

export interface GetExamSessionsParams {
  classId?: number;
  assessmentTemplateId?: number;
  lecturerId?: number;
  studentId?: number;
  status?: string;
  pageNumber: number;
  pageSize: number;
}

export interface GetExamSessionsResponse {
  items: ExamSession[];
  total: number;
}

export interface CreateExamSessionPayload {
  semesterCourseId: number;
  assessmentTemplateId: number;
  examinerId: number;
  startAt: string;
  endAt: string;
}

export interface UpdateExamSessionPayload {
  assessmentTemplateId: number;
  startAt: string;
  endAt: string;
}

export interface EnrollExamSessionPayload {
  studentId: number;
  enrollmentCode: string;
}

export interface EnrollExamSessionResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: any;
}

export interface ExamSessionStudentPayload {
  studentIds: number[];
}

export interface GetExamSessionStudentsResponse {
  examSessionId: number;
  students: ExamSessionStudent[];
}

export interface GetExamSessionStudentsApiReponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: GetExamSessionStudentsResponse;
}

export interface ExamSessionStudentApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: GetExamSessionStudentsResponse;
}

export class ExamSessionService {
  async getExamSessions(
    params: GetExamSessionsParams
  ): Promise<GetExamSessionsResponse> {
    try {
      const response = await apiService.get<ExamSessionListApiResponse>(
        "/ExamSession/list",
        { params: params }
      );
      return {
        items: response.result?.items || [],
        total: response.result?.totalCount || 0,
      };
    } catch (error: any) {
      // Handle 404 gracefully - endpoint might not exist or no data available
      if (error?.response?.status === 404) {
        console.warn('ExamSession/list endpoint not found or no data available, returning empty list');
        return { items: [], total: 0 };
      }
      // Re-throw other errors
      throw error;
    }
  }

  async createExamSession(
    payload: CreateExamSessionPayload
  ): Promise<ExamSession> {
    const response = await apiService.post<ExamSessionApiResponse>(
      "/ExamSession/create",
      payload
    );
    return response.result;
  }

  async updateExamSession(
    examSessionId: string | number,
    payload: UpdateExamSessionPayload
  ): Promise<ExamSession> {
    const response = await apiService.put<ExamSessionApiResponse>(
      `/ExamSession/${examSessionId}`,
      payload
    );
    return response.result;
  }

  async deleteExamSession(examSessionId: string | number): Promise<void> {
    await apiService.delete(`/ExamSession/${examSessionId}`);
  }

  async enrollExamSession(payload: EnrollExamSessionPayload): Promise<any> {
    const response = await apiService.post<EnrollExamSessionResponse>(
      "/ExamSession/enroll",
      payload
    );
    return response.result;
  }

  async getExamSessionStudents(
    examSessionId: string | number
  ): Promise<GetExamSessionStudentsResponse> {
    const response = await apiService.get<GetExamSessionStudentsApiReponse>(
      `/ExamSessionStudent/${examSessionId}/students`
    );
    return response.result;
  }

  async addStudentsToExamSession(
    examSessionId: string | number,
    payload: ExamSessionStudentPayload
  ): Promise<any> {
    const response = await apiService.post<ExamSessionStudentApiResponse>(
      `/ExamSessionStudent/${examSessionId}/students`,
      payload
    );
    return response.result;
  }

  async removeStudentsFromExamSession(
    examSessionId: string | number,
    payload: ExamSessionStudentPayload
  ): Promise<any> {
    const response = await apiService.delete<ExamSessionStudentApiResponse>(
      `/ExamSessionStudent/${examSessionId}/students`,
      { data: payload }
    );
    return response.result;
  }
}

export const examSessionService = new ExamSessionService();
