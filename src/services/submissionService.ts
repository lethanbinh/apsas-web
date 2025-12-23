import { apiService } from "./api";
export interface SubmissionFile {
  id: number;
  name: string;
  submissionUrl: string;
}
export interface Submission {
  id: number;
  examSessionId?: number;
  classAssessmentId?: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  gradingGroupId?: number;
  lecturerName?: string;
  submittedAt: string;
  status: number;
  lastGrade: number;
  submissionFile: SubmissionFile | null;
  createdAt: string;
  updatedAt: string;
}
export interface SubmissionListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: Submission[];
}
export interface GetSubmissionsParams {
  examSessionId?: number;
  classAssessmentId?: number;
  classId?: number;
  excludeLecturerId?: number;
  studentId?: number;
  gradingGroupId?: number;
  status?: number;
}
export interface CreateSubmissionPayload {
  ExamSessionId?: number;
  ClassAssessmentId?: number;
  StudentId: number;
  file: File;
}
export interface UpdateSubmissionPayload {
  file: File;
}
export interface SubmissionApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: Submission;
}
export interface DeleteSubmissionApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: string;
}
export class SubmissionService {
  async getSubmissionList(params: GetSubmissionsParams): Promise<Submission[]> {
    const response = await apiService.get<SubmissionListApiResponse>(
      "/Submission/list",
      { params: params }
    );
    return response.result;
  }
  async createSubmission(
    payload: CreateSubmissionPayload
  ): Promise<Submission> {
    const formData = new FormData();
    if (payload.ExamSessionId !== undefined) {
      formData.append("ExamSessionId", payload.ExamSessionId.toString());
    }
    if (payload.ClassAssessmentId !== undefined) {
      formData.append("ClassAssessmentId", payload.ClassAssessmentId.toString());
    }
    formData.append("StudentId", payload.StudentId.toString());
    formData.append("file", payload.file);
    const response = await apiService.post<SubmissionApiResponse>(
      "/Submission/create",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.result;
  }
  async updateSubmission(
    submissionId: number,
    payload: UpdateSubmissionPayload
  ): Promise<Submission> {
    const formData = new FormData();
    formData.append("SubmissionURL", payload.file);
    const response = await apiService.put<SubmissionApiResponse>(
      `/Submission/${submissionId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.result;
  }
  async deleteSubmission(submissionId: number): Promise<void> {
    const response = await apiService.delete<DeleteSubmissionApiResponse>(
      `/Submission/${submissionId}`
    );
    if (!response.isSuccess) {
      throw new Error(
        response.errorMessages?.join(", ") || "Failed to delete submission"
      );
    }
  }
  async updateSubmissionGrade(
    submissionId: number,
    grade: number
  ): Promise<Submission> {
    const response = await apiService.put<SubmissionApiResponse>(
      `/Submission/${submissionId}/grade`,
      { grade }
    );
    return response.result;
  }
}
export const submissionService = new SubmissionService();