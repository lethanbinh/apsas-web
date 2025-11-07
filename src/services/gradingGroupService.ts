import { apiService } from "./api";
export interface GradingGroupSubmission {
  id: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  examSessionId: number;
  submittedAt: string;
  status: number;
  lastGrade: number;
}

export interface GradingGroup {
  id: number;
  lecturerId: number;
  lecturerName: string | null;
  lecturerCode: string | null;
  createdAt: string;
  updatedAt: string;
  submissionCount: number;
  submissions: GradingGroupSubmission[];
}

export interface GradingGroupListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: GradingGroup[];
}

export interface GradingGroupApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: GradingGroup;
}

export interface GetGradingGroupsParams {
  lecturerId?: number;
}

export interface CreateGradingGroupPayload {
  lecturerId: number;
  submissionIds: number[];
}

export interface AssignSubmissionsPayload {
  submissionIds: number[];
}

export interface RemoveSubmissionsPayload {
  submissionIds: number[];
  targetGradingGroupId: number;
}

export class GradingGroupService {
  async getGradingGroups(
    params: GetGradingGroupsParams
  ): Promise<GradingGroup[]> {
    const response = await apiService.get<GradingGroupListApiResponse>(
      "/GradingGroup/list",
      { params: params }
    );
    return response.result;
  }

  async createGradingGroup(
    payload: CreateGradingGroupPayload
  ): Promise<GradingGroup> {
    const response = await apiService.post<GradingGroupApiResponse>(
      "/GradingGroup/create",
      payload
    );
    return response.result;
  }

  async assignSubmissions(
    gradingGroupId: number,
    payload: AssignSubmissionsPayload
  ): Promise<GradingGroup> {
    const response = await apiService.post<GradingGroupApiResponse>(
      `/GradingGroup/${gradingGroupId}/assign-submissions`,
      payload
    );
    return response.result;
  }

  async removeSubmissions(
    gradingGroupId: number,
    payload: RemoveSubmissionsPayload
  ): Promise<GradingGroup> {
    const response = await apiService.post<GradingGroupApiResponse>(
      `/GradingGroup/${gradingGroupId}/remove-submissions`,
      payload
    );
    return response.result;
  }
}

export const gradingGroupService = new GradingGroupService();
