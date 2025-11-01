import { apiService } from "./api";
export interface ClassInfo {
  id: number;
  classCode: string;
  totalStudent: string;
  description: string;
  lecturerId: string;
  semesterCourseId: string;
  createdAt: string;
  updatedAt: string;
  lecturerName: string;
  lecturerCode: string;
  courseName: string;
  courseCode: string;
  semesterName: string;
  studentCount: string;
}

export interface ClassApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: ClassInfo;
}

export interface CreateClassPayload {
  classCode: string;
  totalStudent: number;
  description: string;
  lecturerId: number;
  semesterCourseId: number;
}

export interface UpdateClassPayload {
  classCode: string;
  totalStudent: number;
  description: string;
  lecturerId: number;
  semesterCourseId: number;
}

export class ClassManagementService {
  async createClass(payload: CreateClassPayload): Promise<ClassInfo> {
    const response = await apiService.post<ClassApiResponse>(
      "/Class/create",
      payload
    );
    return response.result;
  }

  async updateClass(
    classId: string | number,
    payload: UpdateClassPayload
  ): Promise<ClassInfo> {
    const response = await apiService.put<ClassApiResponse>(
      `/Class/${classId}`,
      payload
    );
    return response.result;
  }

  async deleteClass(classId: string | number): Promise<void> {
    await apiService.delete(`/Class/${classId}`);
  }
}

export const classManagementService = new ClassManagementService();
