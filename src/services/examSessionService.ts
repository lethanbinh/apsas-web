import { apiService } from "./api";
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
  classCode: string;
  courseName: string;
  lecturerName: string;
  submissionCount: string;
  status: string;
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
  studentIds: number[];
  semesterCourseId: number;
  assessmentTemplateId: number;
  examinerId: number;
  startAt: string;
  endAt: string;
}

export interface UpdateExamSessionPayload {
  studentIds: number[];
  assessmentTemplateId: number;
  startAt: string;
  endAt: string;
}

export class ExamSessionService {
  async getExamSessions(
    params: GetExamSessionsParams
  ): Promise<GetExamSessionsResponse> {
    const response = await apiService.get<ExamSessionListApiResponse>(
      "/ExamSession/list",
      { params: params }
    );
    return {
      items: response.result.items,
      total: response.result.totalCount,
    };
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
}

export const examSessionService = new ExamSessionService();