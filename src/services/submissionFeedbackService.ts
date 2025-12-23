import { apiService } from "./api";
export interface SubmissionFeedback {
  id: number;
  feedbackText: string;
  submissionId: number;
  createdAt: string;
  updatedAt: string;
}
export interface SubmissionFeedbackListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: SubmissionFeedback[];
}
export interface SubmissionFeedbackApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: SubmissionFeedback;
}
export interface CreateSubmissionFeedbackPayload {
  submissionId: number;
  feedbackText: string;
}
export interface UpdateSubmissionFeedbackPayload {
  feedbackText: string;
}
export interface GetSubmissionFeedbackListParams {
  submissionId: number;
}
export class SubmissionFeedbackService {
  async getSubmissionFeedbackList(
    params: GetSubmissionFeedbackListParams
  ): Promise<SubmissionFeedback[]> {
    const response = await apiService.get<SubmissionFeedbackListApiResponse>(
      "/SubmissionFeedback/list",
      { params: { submissionId: params.submissionId } }
    );
    return response.result;
  }
  async createSubmissionFeedback(
    payload: CreateSubmissionFeedbackPayload
  ): Promise<SubmissionFeedback> {
    const response = await apiService.post<SubmissionFeedbackApiResponse>(
      "/SubmissionFeedback/create",
      {
        submissionId: payload.submissionId,
        feedbackText: payload.feedbackText,
      }
    );
    return response.result;
  }
  async updateSubmissionFeedback(
    submissionFeedbackId: number,
    payload: UpdateSubmissionFeedbackPayload
  ): Promise<SubmissionFeedback> {
    const response = await apiService.put<SubmissionFeedbackApiResponse>(
      `/SubmissionFeedback/${submissionFeedbackId}`,
      {
        feedbackText: payload.feedbackText,
      }
    );
    return response.result;
  }
  async deleteSubmissionFeedback(
    submissionFeedbackId: number
  ): Promise<void> {
    const response = await apiService.delete<SubmissionFeedbackApiResponse>(
      `/SubmissionFeedback/${submissionFeedbackId}`
    );
    if (!response.isSuccess) {
      throw new Error(
        response.errorMessages?.join(", ") ||
          "Failed to delete submission feedback"
      );
    }
  }
}
export const submissionFeedbackService = new SubmissionFeedbackService();