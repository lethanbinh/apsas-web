import { apiService } from "./api";
export interface Lecturer {
  accountId: string;
  lecturerId: string;
  accountCode: string;
  username: string;
  email: string;
  phoneNumber: string;
  fullName: string;
  avatar: string;
  address: string;
  gender: number;
  dateOfBirth: string; // Chuỗi ISO
  role: number;
  department: string;
  specialization: string;
  createdAt: string; // Chuỗi ISO
  updatedAt: string; // Chuỗi ISO
}

export interface LecturerListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: Lecturer[];
}

export class LecturerService {
  async getLecturerList(): Promise<Lecturer[]> {
    const response = await apiService.get<LecturerListApiResponse>(
      "/Lecturer/list"
    );

    return response.result;
  }
}
export const lecturerService = new LecturerService();
