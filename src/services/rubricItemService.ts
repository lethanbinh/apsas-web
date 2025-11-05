import { apiService } from "./api";
export interface RubricItem {
  id: number;
  description: string;
  input: string;
  output: string;
  score: number;
  assessmentQuestionId: number;
  questionText: string;
  createdAt: string;
  updatedAt: string;
}

export interface RubricItemListResult {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: RubricItem[];
}

export interface RubricItemListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: RubricItemListResult;
}

export interface RubricItemApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: RubricItem;
}

export interface GetRubricsParams {
  assessmentQuestionId?: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetRubricsResponse {
  items: RubricItem[];
  total: number;
}

export interface CreateRubricItemPayload {
  description: string;
  input: string;
  output: string;
  score: number;
  assessmentQuestionId: number;
}

export interface UpdateRubricItemPayload {
  description: string;
  input: string;
  output: string;
  score: number;
}

export class RubricItemService {
  async getRubricsForQuestion(
    params: GetRubricsParams
  ): Promise<GetRubricsResponse> {
    const response = await apiService.get<RubricItemListApiResponse>(
      "/RubricItem/page",
      { params: params }
    );
    return {
      items: response.result.items,
      total: response.result.totalCount,
    };
  }

  async createRubricItem(
    payload: CreateRubricItemPayload
  ): Promise<RubricItem> {
    const response = await apiService.post<RubricItemApiResponse>(
      "/RubricItem/create",
      payload
    );
    return response.result;
  }

  async updateRubricItem(
    rubricItemId: string | number,
    payload: UpdateRubricItemPayload
  ): Promise<RubricItem> {
    const response = await apiService.put<RubricItemApiResponse>(
      `/RubricItem/${rubricItemId}`,
      payload
    );
    return response.result;
  }

  async deleteRubricItem(rubricItemId: string | number): Promise<void> {
    await apiService.delete(`/RubricItem/${rubricItemId}`);
  }
}

export const rubricItemService = new RubricItemService();
