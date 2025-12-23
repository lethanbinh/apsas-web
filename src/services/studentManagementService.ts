import { apiService } from "./api";
import { StudentInClass } from "./classService";
export interface StudentDetail {
  id: string;
  accountId: string;
  studentId: string;
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
export interface StudentListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: StudentDetail[];
}
export interface StudentInClassBasic {
  id: number;
  enrollmentDate: string;
  description: string;
  classId: number;
  studentId: number;
  createdAt: string;
  updatedAt: string;
  classCode: string;
  classDescription: string;
  lecturerName: string | null;
  lecturerCode: string | null;
  courseName: string | null;
  courseCode: string | null;
  semesterName: string | null;
  semesterCode: string | null;
  studentName: string;
  studentCode: string;
}
export interface StudentGroupApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: StudentInClassBasic;
}
export interface CreateStudentGroupPayload {
  classId: number;
  studentId: number;
  description: string;
}
export interface UpdateStudentGroupPayload {
  description: string;
}
export interface StudentGroupListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: StudentInClass[];
}
export class StudentManagementService {
  async getStudentsInClass(
    classId: string | number
  ): Promise<StudentInClass[]> {
    const response = await apiService.get<StudentGroupListApiResponse>(
      `/StudentGroup/class/${classId}`
    );
    return response.result;
  }
  async getStudentList(): Promise<StudentDetail[]> {
    const response = await apiService.get<StudentListApiResponse>(
      "/Student/list"
    );
    return response.result;
  }
  async createStudentGroup(
    payload: CreateStudentGroupPayload
  ): Promise<StudentInClassBasic> {
    const response = await apiService.post<StudentGroupApiResponse>(
      "/StudentGroup/create",
      payload
    );
    return response.result;
  }
  async updateStudentGroup(
    studentGroupId: string | number,
    payload: UpdateStudentGroupPayload
  ): Promise<StudentInClassBasic> {
    const response = await apiService.put<StudentGroupApiResponse>(
      `/StudentGroup/${studentGroupId}`,
      payload
    );
    return response.result;
  }
  async deleteStudentGroup(studentGroupId: string | number): Promise<void> {
    await apiService.delete(`/StudentGroup/${studentGroupId}`);
  }
  async createStudent(payload: CreateStudentPayload): Promise<StudentDetail> {
    const response = await apiService.post<StudentListApiResponse>(
      "/Student/create",
      payload
    );
    return response.result as any;
  }
}
export interface CreateStudentPayload {
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
export const studentManagementService = new StudentManagementService();