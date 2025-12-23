import { apiService } from "./api";
export interface CreateClassAssessmentPayload {
  classId: number;
  assessmentTemplateId: number;
  startAt: string;
  endAt: string;
  isPublished?: boolean;
}
export interface ClassAssessment {
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
  students: any[];
  submissionCount: string;
  status: number;
  isPublished?: boolean;
}
export interface ClassAssessmentApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: ClassAssessment;
}
export interface ClassAssessmentListResult {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: ClassAssessment[];
}
export interface ClassAssessmentListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: ClassAssessmentListResult;
}
export interface GetClassAssessmentsParams {
  classId?: number;
  assessmentTemplateId?: number;
  lecturerId?: number;
  studentId?: number;
  status?: string;
  pageNumber: number;
  pageSize: number;
}
export interface GetClassAssessmentsResponse {
  items: ClassAssessment[];
  total: number;
}
export class ClassAssessmentService {
  async createClassAssessment(
    payload: CreateClassAssessmentPayload
  ): Promise<ClassAssessment> {
    const response = await apiService.post<ClassAssessmentApiResponse>(
      "/ClassAssessment/create",
      payload
    );
    return response.result;
  }
  async getClassAssessments(
    params: GetClassAssessmentsParams
  ): Promise<GetClassAssessmentsResponse> {
    const response = await apiService.get<ClassAssessmentListApiResponse>(
      "/ClassAssessment/list",
      { params: params }
    );
    return {
      items: response.result.items,
      total: response.result.totalCount,
    };
  }
  async updateClassAssessment(
    classAssessmentId: string | number,
    payload: Partial<CreateClassAssessmentPayload>
  ): Promise<ClassAssessment> {
    const response = await apiService.put<ClassAssessmentApiResponse>(
      `/ClassAssessment/${classAssessmentId}`,
      payload
    );
    return response.result;
  }
}
export const classAssessmentService = new ClassAssessmentService();