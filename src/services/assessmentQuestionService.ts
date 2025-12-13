import { apiService } from "./api";

export interface AssessmentQuestion {
  id: number;
  questionText: string;
  questionSampleInput: string;
  questionSampleOutput: string;
  score: number;
  questionNumber: number;
  assessmentPaperId: number;
  assessmentPaperName: string;
  rubricCount: number;
  reviewerComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentQuestionApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssessmentQuestion;
}

export interface AssessmentQuestionListResult {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: AssessmentQuestion[];
}

export interface AssessmentQuestionListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssessmentQuestionListResult;
}

export interface GetAssessmentQuestionsParams {
  assessmentPaperId?: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateAssessmentQuestionPayload {
  questionText: string;
  questionSampleInput: string;
  questionSampleOutput: string;
  score: number;
  questionNumber: number;
  assessmentPaperId: number;
}

export interface UpdateAssessmentQuestionPayload {
  questionText: string;
  questionSampleInput: string;
  questionSampleOutput: string;
  score: number;
  questionNumber: number;
  reviewerComment?: string;
}

export interface GetAssessmentQuestionsResponse {
  items: AssessmentQuestion[];
  total: number;
}

export class AssessmentQuestionService {
  async getAssessmentQuestions(
    params: GetAssessmentQuestionsParams
  ): Promise<GetAssessmentQuestionsResponse> {
    const response = await apiService.get<AssessmentQuestionListApiResponse>(
      "/AssessmentQuestion/list",
      { params: params }
    );
    return {
      items: response.result.items,
      total: response.result.totalCount,
    };
  }

  async createAssessmentQuestion(
    payload: CreateAssessmentQuestionPayload
  ): Promise<AssessmentQuestion> {
    const response = await apiService.post<AssessmentQuestionApiResponse>(
      "/AssessmentQuestion/create",
      payload
    );
    return response.result;
  }

  async updateAssessmentQuestion(
    assessmentQuestionId: string | number,
    payload: UpdateAssessmentQuestionPayload
  ): Promise<AssessmentQuestion> {
    const response = await apiService.put<AssessmentQuestionApiResponse>(
      `/AssessmentQuestion/${assessmentQuestionId}`,
      payload
    );
    return response.result;
  }

  async deleteAssessmentQuestion(
    assessmentQuestionId: string | number
  ): Promise<void> {
    await apiService.delete(`/AssessmentQuestion/${assessmentQuestionId}`);
  }
}

export const assessmentQuestionService = new AssessmentQuestionService();
