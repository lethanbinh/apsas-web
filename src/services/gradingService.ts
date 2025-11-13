import { apiService } from "./api";

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
}

export const gradingService = new GradingService();