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

export interface ClassListResult {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: ClassInfo[];
}

export interface ClassListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: ClassListResult;
}

export interface ClassApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: ClassInfo;
}

export interface GetClassListParams {
  lecturerId?: number;
  semesterCourseId?: number;
  includeStudents?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface GetClassListResponse {
  classes: ClassInfo[];
  total: number;
}

export interface StudentInClass {
  id: number;
  enrollmentDate: string;
  description: string;
  classId: number;
  studentId: number;
  createdAt: string;
  updatedAt: string;
  classCode: string;
  classDescription: string;
  lecturerName: string;
  lecturerCode: string;
  courseName: string;
  courseCode: string;
  semesterName: string;
  semesterCode: string;
  studentName: string;
  studentCode: string;
}

export interface StudentGroupApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: StudentInClass[];
}

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

export interface StudentApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: StudentDetail;
}

export class ClassService {
  async getClassList(
    params: GetClassListParams
  ): Promise<GetClassListResponse> {
    const response = await apiService.get<ClassListApiResponse>("/Class/list", {
      params: params,
    });
    return {
      classes: response.result.items,
      total: response.result.totalCount,
    };
  }

  async getClassById(classId: string | number): Promise<ClassInfo> {
    const response = await apiService.get<ClassApiResponse>(
      `/Class/${classId}`
    );
    return response.result;
  }

  async getStudentsInClass(
    classId: string | number
  ): Promise<StudentInClass[]> {
    const response = await apiService.get<StudentGroupApiResponse>(
      `/StudentGroup/class/${classId}`
    );
    return response.result;
  }

  async getStudentById(studentId: string | number): Promise<StudentDetail> {
    const response = await apiService.get<StudentApiResponse>(
      `/Student/${studentId}`
    );
    return response.result;
  }

  async getClassesByStudentId(
    studentId: number
  ): Promise<StudentInClass[]> {
    try {

      const response = await apiService.get<StudentGroupApiResponse>(
        `/StudentGroup/student/${studentId}`
      );
      return response.result || [];
    } catch (error: any) {

      if (error?.response?.status === 404) {
        console.warn(`StudentGroup/student/${studentId} endpoint not found, using fallback method`);
      } else {
        console.warn("Direct endpoint not available, using fallback method", error);
      }


      const { classes } = await this.getClassList({
        pageNumber: 1,
        pageSize: 1000,
      });

      const studentClasses: StudentInClass[] = [];
      for (const cls of classes) {
        try {
          const students = await this.getStudentsInClass(cls.id);
          const studentInClass = students.find(
            (s) => s.studentId === studentId
          );
          if (studentInClass) {
            studentClasses.push(studentInClass);
          }
        } catch (err) {

          console.warn(`Failed to get students for class ${cls.id}:`, err);
        }
      }
      return studentClasses;
    }
  }
}

export const classService = new ClassService();
