import { apiService } from "./api";
export interface AssessmentPaper {
  id: number;
  name: string;
  description: string;
  assessmentTemplateId: number;
  assessmentTemplateName: string;
  questionCount: number;
  language?: number;
  createdAt: string;
  updatedAt: string;
}
export interface AssessmentPaperApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssessmentPaper;
}
export interface AssessmentPaperListResult {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: AssessmentPaper[];
}
export interface AssessmentPaperListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssessmentPaperListResult;
}
export interface GetAssessmentPapersParams {
  assessmentTemplateId?: number;
  pageNumber: number;
  pageSize: number;
}
export interface CreateAssessmentPaperPayload {
  name: string;
  description: string;
  assessmentTemplateId: number;
  language: number;
}
export interface UpdateAssessmentPaperPayload {
  name: string;
  description: string;
  language: number;
}
export interface GetAssessmentPapersResponse {
  items: AssessmentPaper[];
  total: number;
}
export class AssessmentPaperService {
  async getAssessmentPapers(
    params: GetAssessmentPapersParams
  ): Promise<GetAssessmentPapersResponse> {
    const response = await apiService.get<AssessmentPaperListApiResponse>(
      "/AssessmentPaper/list",
      { params: params }
    );
    return {
      items: response.result.items,
      total: response.result.totalCount,
    };
  }
  async createAssessmentPaper(
    payload: CreateAssessmentPaperPayload
  ): Promise<AssessmentPaper> {
    const response = await apiService.post<AssessmentPaperApiResponse>(
      "/AssessmentPaper/create",
      payload
    );
    return response.result;
  }
  async updateAssessmentPaper(
    assessmentPaperId: string | number,
    payload: UpdateAssessmentPaperPayload
  ): Promise<AssessmentPaper> {
    const response = await apiService.put<AssessmentPaperApiResponse>(
      `/AssessmentPaper/${assessmentPaperId}`,
      payload
    );
    return response.result;
  }
  async deleteAssessmentPaper(
    assessmentPaperId: string | number
  ): Promise<any> {
    await apiService.delete(`/AssessmentPaper/${assessmentPaperId}`);
  }
}
export const assessmentPaperService = new AssessmentPaperService();