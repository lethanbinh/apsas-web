import { apiService } from "./api";

export interface FileTemplate {
  id: number;
  name: string;
  fileUrl: string;
  fileTemplate: number;
}

export interface QuestionTemplate {
  id: number;
  questionText: string;
  questionSampleInput: string;
  questionSampleOutput: string;
  score: number;
  rubricCount: number;
}

export interface PaperTemplate {
  id: number;
  name: string;
  description: string;
  questionCount: number;
  questions: QuestionTemplate[];
}

export interface AssessmentTemplate {
  id: number;
  assignRequestId: number;
  templateType: number;
  name: string;
  description: string;
  createdByLecturerId: number;
  lecturerName: string;
  lecturerCode: string;
  assignedToHODId: number;
  hodName: string;
  hodCode: string;
  courseElementId: number;
  courseElementName: string;
  createdAt: string;
  updatedAt: string;
  files: FileTemplate[];
  papers: PaperTemplate[];
}

export interface AssessmentTemplateListResult {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: AssessmentTemplate[];
}

export interface AssessmentTemplateListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssessmentTemplateListResult;
}

export interface GetAssessmentTemplatesParams {
  lecturerId?: number;
  assignedToHODId?: number;
  assignRequestId?: number;
  semesterId?: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetAssessmentTemplatesResponse {
  items: AssessmentTemplate[];
  total: number;
}

export interface CreateAssessmentTemplatePayload {
  assignRequestId: number;
  templateType: number;
  name: string;
  description: string;
  createdByLecturerId: number;
  assignedToHODId: number;
}

export interface AssessmentTemplateApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssessmentTemplate;
}

export interface UpdateAssessmentTemplatePayload {
  templateType: number;
  name: string;
  description: string;
  assignedToHODId: number;
}

export class AssessmentTemplateService {
  async getAssessmentTemplates(
    params: GetAssessmentTemplatesParams
  ): Promise<GetAssessmentTemplatesResponse> {
    const response = await apiService.get<AssessmentTemplateListApiResponse>(
      "/AssessmentTemplate/list",
      { params: params }
    );
    return {
      items: response.result.items,
      total: response.result.totalCount,
    };
  }

  async createAssessmentTemplate(
    payload: CreateAssessmentTemplatePayload
  ): Promise<AssessmentTemplate> {
    const response = await apiService.post<AssessmentTemplateApiResponse>(
      "/AssessmentTemplate/create",
      payload
    );
    return response.result;
  }

  async updateAssessmentTemplate(
    assessmentTemplateId: string | number,
    payload: UpdateAssessmentTemplatePayload
  ): Promise<AssessmentTemplate> {
    const response = await apiService.put<AssessmentTemplateApiResponse>(
      `/AssessmentTemplate/${assessmentTemplateId}`,
      payload
    );
    return response.result;
  }

  async deleteAssessmentTemplate(
    assessmentTemplateId: string | number
  ): Promise<void> {
    await apiService.delete(`/AssessmentTemplate/${assessmentTemplateId}`);
  }
}

export const assessmentTemplateService = new AssessmentTemplateService();