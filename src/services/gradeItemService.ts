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
  /**
   * Create a new grade item
   * @param payload - Grade item creation payload
   * @returns Created grade item
   */
  async createGradeItem(payload: CreateGradeItemPayload): Promise<GradeItem> {
    const response = await apiService.post<GradeItemApiResponse>(
      "/GradeItem/create",
      payload
    );
    return response.result;
  }

  /**
   * Get a grade item by ID
   * @param gradeItemId - Grade item ID
   * @returns Grade item
   */
  async getGradeItem(gradeItemId: number): Promise<GradeItem> {
    const response = await apiService.get<GradeItemApiResponse>(
      `/GradeItem/${gradeItemId}`
    );
    return response.result;
  }

  /**
   * Update a grade item
   * @param gradeItemId - Grade item ID
   * @param payload - Update payload (score and comments)
   * @returns Updated grade item
   */
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

  /**
   * Delete a grade item
   * @param gradeItemId - Grade item ID
   */
  async deleteGradeItem(gradeItemId: number): Promise<void> {
    await apiService.delete<{
      statusCode: number;
      isSuccess: boolean;
      errorMessages: any[];
      result: any;
    }>(`/GradeItem/${gradeItemId}`);
  }

  /**
   * Get paginated list of grade items
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated grade items
   */
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

