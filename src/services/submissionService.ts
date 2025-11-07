import { apiService } from "./api";
export interface SubmissionFile {
  id: number;
  name: string;
  submissionUrl: string;
}

export interface Submission {
  id: number;
  examSessionId: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  gradingGroupId: number;
  lecturerName: string;
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
  excludeLecturerId?: number;
  studentId?: number;
  gradingGroupId?: number;
  status?: number;
}

export interface CreateSubmissionPayload {
  ExamSessionId: number;
  StudentId: number;
  file: File;
}

export interface SubmissionApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: Submission;
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
    formData.append("ExamSessionId", payload.ExamSessionId.toString());
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
}

export const submissionService = new SubmissionService();
