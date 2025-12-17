import { apiService } from "./api";
export interface GradingGroupSubmission {
  id: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  gradingGroupId: number;
  submittedAt: string | null;
  status: number;
  lastGrade: number;
}

export interface GradingGroup {
  id: number;
  lecturerId: number;
  lecturerName: string | null;
  lecturerCode: string | null;
  assessmentTemplateId: number | null;
  assessmentTemplateName: string | null;
  assessmentTemplateDescription: string | null;
  assessmentTemplateType: number | null;
  createdByExaminerId: number | null;
  examinerName: string | null;
  examinerCode: string | null;
  submittedGradeSheetUrl: string | null;
  gradeSheetSubmittedAt: string | null;
  isGradingCompleted: boolean | null;
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
  assessmentTemplateId: number | null;
  createdByExaminerId: number | null;
}

export interface UpdateGradingGroupPayload {
  lecturerId: number;
  assessmentTemplateId: number;
}

export interface AssignSubmissionsPayload {
  submissionIds: number[];
}

export interface AssignSubmissionsResponse {
  gradingGroupId: number;
  createdSubmissionsCount: number;
  submissionIds: number[];
}

export interface AssignSubmissionsApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssignSubmissionsResponse;
}

export interface AddSubmissionsByFileApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssignSubmissionsResponse;
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

  async getGradingGroupById(id: number): Promise<GradingGroup> {
    const response = await apiService.get<GradingGroupApiResponse>(
      `/GradingGroup/${id}`
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

  async updateGradingGroup(
    id: number,
    payload: UpdateGradingGroupPayload
  ): Promise<GradingGroup> {
    const response = await apiService.put<GradingGroupApiResponse>(
      `/GradingGroup/${id}`,
      payload
    );
    return response.result;
  }

  async deleteGradingGroup(id: number): Promise<void> {
    await apiService.delete(`/GradingGroup/${id}`);
  }

  async assignSubmissions(
    gradingGroupId: number,
    payload: AssignSubmissionsPayload
  ): Promise<AssignSubmissionsResponse> {
    const response = await apiService.post<AssignSubmissionsApiResponse>(
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

  async addSubmissionsByFile(
    gradingGroupId: number,
    payload: { Files: File[] }
  ): Promise<AssignSubmissionsResponse> {
    const formData = new FormData();
    payload.Files.forEach((file) => {
      formData.append("Files", file);
    });

    const response = await apiService.post<AddSubmissionsByFileApiResponse>(
      `/GradingGroup/${gradingGroupId}/add-submissions`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 0,
      }
    );
    return response.result;
  }

  async submitGradesToExaminer(
    gradingGroupId: number,
    file: File
  ): Promise<void> {
    const formData = new FormData();
    formData.append("File", file);

    try {
      await apiService.post(
        `/GradingGroup/${gradingGroupId}/submit-grades-to-examiner`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 0,
        }
      );
    } catch (error: any) {

      if (error.response?.data?.errorMessages && Array.isArray(error.response.data.errorMessages)) {
        const errorMessage = error.response.data.errorMessages.join(", ");
        const customError = new Error(errorMessage);
        (customError as any).response = error.response;
        throw customError;
      }
      throw error;
    }
  }
}

export const gradingGroupService = new GradingGroupService();