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

export interface GradingSession {
  id: number;
  grade: number;
  gradingType: number; // 0: AI, 1: LECTURER, 2: BOTH
  status: number; // 0: PROCESSING, 1: COMPLETED, 2: FAILED
  submissionId: number;
  submissionStudentName: string;
  submissionStudentCode: string;
  createdAt: string;
  updatedAt: string;
  gradeItemCount: number;
  gradeItems: GradeItem[];
  gradingLogs: any[];
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
  status: number; // 0: PROCESSING, 1: COMPLETED, 2: FAILED
}

export interface GetGradingSessionsParams {
  pageNumber?: number;
  pageSize?: number;
  submissionId?: number;
  gradingType?: number; // 0: AI, 1: LECTURER, 2: BOTH
  status?: number; // 0: PROCESSING, 1: COMPLETED, 2: FAILED
}

export class GradingService {
  async createGrading(payload: CreateGradingPayload): Promise<Grading> {
    const response = await apiService.post<GradingApiResponse>(
      "/grading",
      payload
    );
    return response.result;
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
          timeout: 300000 // 5 minutes - allow enough time for AI feedback processing
        }
      );
      
      // Check if API returned an error (even with 200 status)
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
      // If it's already an API error we created, re-throw it
      if (error.isApiError) {
        throw error;
      }
      
      // If it's an axios error (HTTP error like 404, 500, etc.)
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
      
      // Re-throw original error if we can't extract message
      throw error;
    }
  }

  /**
   * Get AI feedback and format it using Gemini Pro
   * @param submissionId - Submission ID
   * @param provider - Optional provider (defaults to OpenAI)
   * @returns Formatted feedback data ready for form
   */
  async getFormattedAiFeedback(
    submissionId: number,
    provider: string = "OpenAI"
  ): Promise<FeedbackData> {
    // Get raw feedback from AI feedback API
    const aiFeedback = await this.getAiFeedback(submissionId, provider);
    
    // Format feedback using Gemini Pro
    const formattedFeedback = await geminiService.formatFeedback(aiFeedback.feedback);
    
    return formattedFeedback;
  }

  /**
   * Get paginated list of grading sessions
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated grading sessions
   */
  async getGradingSessions(
    params?: GetGradingSessionsParams
  ): Promise<PaginatedGradingSessionsResponse["result"]> {
    const response = await apiService.get<PaginatedGradingSessionsResponse>(
      "/GradingSession/page",
      { params }
    );
    return response.result;
  }

  /**
   * Update a grading session
   * @param gradingSessionId - Grading session ID
   * @param payload - Update payload (grade and status)
   * @returns Updated grading session
   */
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

  /**
   * Delete a grading session
   * @param gradingSessionId - Grading session ID
   */
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