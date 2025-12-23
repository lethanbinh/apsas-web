import { apiService } from "./api";
import { geminiService, FeedbackData } from "./geminiService";
export interface Grading {
  id: number;
  submissionId: number;
  status: string;
  grade: number;
  gradingType: number;
  createdAt: string;
  updatedAt: string;
}
export interface GradingApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: Grading;
}
export interface CreateGradingPayload {
  submissionId: number;
  assessmentTemplateId: number;
}
export interface UploadTestFileResponse {
  message: string;
  folderName: string;
}
export interface UploadPostmanCollectionResponse {
  message: string;
  path: string;
}
export interface AiFeedbackResult {
  feedback: string;
  language: string;
  provider: string;
  submissionId: number;
  fileName: string;
}
export interface AiFeedbackApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AiFeedbackResult;
}
export interface GradeItem {
  id: number;
  score: number;
  comments: string;
  rubricItemId: number;
  rubricItemDescription: string;
  rubricItemMaxScore: number;
}
export interface GradingLog {
  id: number;
  action: string;
  details: string;
  timestamp: string;
}
export interface GradingSession {
  id: number;
  grade: number;
  gradingType: number;
  status: number;
  submissionId: number;
  submissionStudentName: string;
  submissionStudentCode: string;
  createdAt: string;
  updatedAt: string;
  gradeItemCount: number;
  gradeItems: GradeItem[];
  gradingLogs: GradingLog[];
}
export interface PaginatedGradingSessionsResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    items: GradingSession[];
  };
}
export interface UpdateGradingSessionPayload {
  grade: number;
  status: number;
}
export interface GetGradingSessionsParams {
  pageNumber?: number;
  pageSize?: number;
  submissionId?: number;
  gradingType?: number;
  status?: number;
}
export class GradingService {
  async createGrading(payload: CreateGradingPayload): Promise<Grading> {
    const response = await apiService.post<GradingApiResponse>(
      "/grading",
      payload,
      {
        timeout: 0,
      }
    );
    return response.result;
  }
  async autoGrading(payload: CreateGradingPayload): Promise<GradingSession> {
    try {
      const response = await apiService.post<{
        statusCode: number;
        isSuccess: boolean;
        errorMessages: any[];
        result: GradingSession;
      }>("/grading", payload, {
        timeout: 0,
      });
      if (!response.isSuccess) {
        const errorMessage = response.errorMessages?.join(", ") || "Failed to start auto grading";
        throw new Error(errorMessage);
      }
      return response.result;
    } catch (error: any) {
      if (error.response?.data) {
        const apiError = error.response.data;
        if (apiError.errorMessages && apiError.errorMessages.length > 0) {
          throw new Error(apiError.errorMessages.join(", "));
        }
        if (apiError.message) {
          throw new Error(apiError.message);
        }
      }
      throw error;
    }
  }
  async getGradingSession(id: number): Promise<Grading> {
    const response = await apiService.get<GradingApiResponse>(
      `/grading/session/${id}`
    );
    return response.result;
  }
  async uploadTestFile(
    submissionId: number,
    file: File
  ): Promise<UploadTestFileResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiService.post<{
      statusCode: number;
      isSuccess: boolean;
      errorMessages: any[];
      result: UploadTestFileResponse;
    }>(
      `/grading/upload-test-file?submissionId=${submissionId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.result;
  }
  async uploadPostmanCollectionDatabase(
    template: 0 | 1,
    assessmentTemplateId: number,
    file: File
  ): Promise<UploadPostmanCollectionResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiService.post<{
      statusCode: number;
      isSuccess: boolean;
      errorMessages: any[];
      result: UploadPostmanCollectionResponse;
    }>(
      `/grading/postman-collection-database?template=${template}&assessmentTemplateId=${assessmentTemplateId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.result;
  }
  async getAiFeedback(
    submissionId: number,
    provider?: string
  ): Promise<AiFeedbackResult> {
    try {
      const params = provider ? { provider } : {};
      const response = await apiService.post<AiFeedbackApiResponse>(
        `/grading/ai-feedback/submission/${submissionId}`,
        {},
        {
          params,
          timeout: 0
        }
      );
      if (!response.isSuccess) {
        const errorMessage = response.errorMessages?.join(", ") || "Failed to get AI feedback";
        const error = new Error(errorMessage) as any;
        error.isApiError = true;
        error.apiResponse = response;
        throw error;
      }
      if (!response.result) {
        const error = new Error("No feedback data returned from API") as any;
        error.isApiError = true;
        throw error;
      }
      return response.result;
    } catch (error: any) {
      if (error.isApiError) {
        throw error;
      }
      if (error.response?.data) {
        const apiResponse = error.response.data as AiFeedbackApiResponse;
        if (apiResponse.errorMessages && apiResponse.errorMessages.length > 0) {
          const errorMessage = apiResponse.errorMessages.join(", ");
          const apiError = new Error(errorMessage) as any;
          apiError.isApiError = true;
          apiError.apiResponse = apiResponse;
          throw apiError;
        }
      }
      throw error;
    }
  }
  async getFormattedAiFeedback(
    submissionId: number,
    provider: string = "OpenAI"
  ): Promise<FeedbackData> {
    const aiFeedback = await this.getAiFeedback(submissionId, provider);
    const formattedFeedback = await geminiService.formatFeedback(aiFeedback.feedback);
    return formattedFeedback;
  }
  async getGradingSessions(
    params?: GetGradingSessionsParams
  ): Promise<PaginatedGradingSessionsResponse["result"]> {
    const response = await apiService.get<PaginatedGradingSessionsResponse>(
      "/GradingSession/page",
      { params }
    );
    return response.result;
  }
  async updateGradingSession(
    gradingSessionId: number,
    payload: UpdateGradingSessionPayload
  ): Promise<void> {
    await apiService.put<{
      statusCode: number;
      isSuccess: boolean;
      errorMessages: any[];
      result: any;
    }>(`/GradingSession/${gradingSessionId}`, payload);
  }
  async deleteGradingSession(gradingSessionId: number): Promise<void> {
    await apiService.delete<{
      statusCode: number;
      isSuccess: boolean;
      errorMessages: any[];
      result: any;
    }>(`/GradingSession/${gradingSessionId}`);
  }
}
export const gradingService = new GradingService();