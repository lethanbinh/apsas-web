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
export interface AssessmentFileListResult {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: AssessmentFile[];
}
export interface AssessmentFileListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssessmentFileListResult;
}
export interface AssessmentFileApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssessmentFile;
}
export interface AssessmentFileDeleteResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: string;
}
export interface CreateAssessmentFilePayload {
  File: File;
  Name: string;
  DatabaseName?: string;
  FileTemplate: number;
  AssessmentTemplateId: number;
}
export interface GetAssessmentFilesParams {
  assessmentTemplateId?: number;
  pageNumber: number;
  pageSize: number;
}
export interface GetAssessmentFilesResponse {
  items: AssessmentFile[];
  total: number;
}
export class AssessmentFileService {
  async getFilesForTemplate(
    params: GetAssessmentFilesParams
  ): Promise<GetAssessmentFilesResponse> {
    const response = await apiService.get<AssessmentFileListApiResponse>(
      "/AssessmentFile/page",
      { params: params }
    );
    return {
      items: response.result.items,
      total: response.result.totalCount,
    };
  }
  async createAssessmentFile(
    payload: CreateAssessmentFilePayload
  ): Promise<AssessmentFile> {
    const formData = new FormData();
    formData.append("File", payload.File);
    formData.append("Name", payload.Name);
    if (payload.DatabaseName !== undefined && payload.DatabaseName !== null && payload.DatabaseName !== "") {
      formData.append("DatabaseName", payload.DatabaseName);
    }
    formData.append("FileTemplate", payload.FileTemplate.toString());
    formData.append(
      "AssessmentTemplateId",
      payload.AssessmentTemplateId.toString()
    );
    const response = await apiService.post<AssessmentFileApiResponse>(
      "/AssessmentFile/create",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.result;
  }
  async deleteAssessmentFile(
    assessmentFileId: string | number
  ): Promise<string> {
    const response = await apiService.delete<AssessmentFileDeleteResponse>(
      `/AssessmentFile/${assessmentFileId}`
    );
    return response.result;
  }
}
export const assessmentFileService = new AssessmentFileService();