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

export interface RubricItemListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: RubricItem[];
}

export interface RubricItemApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: RubricItem;
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
    questionId: string | number
  ): Promise<RubricItem[]> {
    const response = await apiService.get<RubricItemListApiResponse>(
      `/RubricItem/question/${questionId}`
    );
    return response.result;
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
