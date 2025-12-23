import { apiService } from "./api";
export interface GradeItem {
  id: number;
  score: number;
  comments: string;
  gradingSessionId: number;
  rubricItemId: number;
  rubricItemDescription: string;
  rubricItemMaxScore: number;
  questionText?: string;
  createdAt: string;
  updatedAt: string;
}
export interface GradeItemApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: GradeItem;
}
export interface CreateGradeItemPayload {
  gradingSessionId: number;
  rubricItemId: number;
  score: number;
  comments: string;
}
export interface UpdateGradeItemPayload {
  score: number;
  comments: string;
}
export interface PaginatedGradeItemsResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    items: GradeItem[];
  };
}
export interface GetGradeItemsParams {
  pageNumber?: number;
  pageSize?: number;
  gradingSessionId?: number;
  rubricItemId?: number;
}
export class GradeItemService {
  async createGradeItem(payload: CreateGradeItemPayload): Promise<GradeItem> {
    const response = await apiService.post<GradeItemApiResponse>(
      "/GradeItem/create",
      payload
    );
    return response.result;
  }
  async getGradeItem(gradeItemId: number): Promise<GradeItem> {
    const response = await apiService.get<GradeItemApiResponse>(
      `/GradeItem/${gradeItemId}`
    );
    return response.result;
  }
  async updateGradeItem(
    gradeItemId: number,
    payload: UpdateGradeItemPayload
  ): Promise<GradeItem> {
    const response = await apiService.put<GradeItemApiResponse>(
      `/GradeItem/${gradeItemId}`,
      payload
    );
    return response.result;
  }
  async deleteGradeItem(gradeItemId: number): Promise<void> {
    await apiService.delete<{
      statusCode: number;
      isSuccess: boolean;
      errorMessages: any[];
      result: any;
    }>(`/GradeItem/${gradeItemId}`);
  }
  async getGradeItems(
    params?: GetGradeItemsParams
  ): Promise<PaginatedGradeItemsResponse["result"]> {
    const response = await apiService.get<PaginatedGradeItemsResponse>(
      "/GradeItem/page",
      { params }
    );
    return response.result;
  }
}
export const gradeItemService = new GradeItemService();