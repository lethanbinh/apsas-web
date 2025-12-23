import { apiService } from "./api";
export interface Examiner {
  accountId: string;
  examinerId: string;
  accountCode: string;
  username: string;
  email: string;
  phoneNumber: string;
  fullName: string;
  avatar: string;
  address: string;
  gender: number;
  dateOfBirth: string;
  role: number;
  createdAt: string;
  updatedAt: string;
}
export interface ExaminerListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: Examiner[];
}
export interface ExaminerApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: Examiner;
}
export interface CreateExaminerPayload {
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  fullName: string;
  avatar?: string;
  address: string;
  gender: number;
  dateOfBirth: string;
}
export class ExaminerService {
  async getExaminerList(): Promise<Examiner[]> {
    const response = await apiService.get<ExaminerListApiResponse>(
      "/Examiner/list"
    );
    return response.result;
  }
  async createExaminer(payload: CreateExaminerPayload): Promise<Examiner> {
    const response = await apiService.post<ExaminerApiResponse>(
      "/Examiner/create",
      payload
    );
    return response.result;
  }
}
export const examinerService = new ExaminerService();