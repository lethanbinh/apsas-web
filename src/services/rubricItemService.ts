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

export class RubricItemService {
  async getRubricsForQuestion(
    questionId: string | number
  ): Promise<RubricItem[]> {
    const response = await apiService.get<RubricItemListApiResponse>(
      `/RubricItem/question/${questionId}`
    );
    return response.result;
  }
}

export const rubricItemService = new RubricItemService();
