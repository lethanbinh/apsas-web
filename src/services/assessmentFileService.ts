import { apiService } from "./api";
export interface AssessmentFile {
  id: number;
  name: string;
  fileUrl: string;
  fileTemplate: number;
  assessmentTemplateId: number;
  assessmentTemplateName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentFileListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssessmentFile[];
}

export class AssessmentFileService {
  async getFilesForTemplate(
    templateId: string | number
  ): Promise<AssessmentFile[]> {
    const response = await apiService.get<AssessmentFileListApiResponse>(
      `/AssessmentFile/template/${templateId}`
    );
    return response.result;
  }
}

export const assessmentFileService = new AssessmentFileService();
