import { apiService } from "./api";
export interface StudentAccount {
  id: number;
  accountCode: string;
  username: string;
  email: string;
  phoneNumber?: string;
  fullName: string;
  avatar: string;
}
export interface Student {
  id: number;
  account: StudentAccount;
  enrollmentDate: string;
}
export interface LecturerAccount {
  id: number;
  accountCode: string;
  username: string;
  email: string;
  phoneNumber?: string;
  fullName: string;
  avatar: string;
}
export interface Lecturer {
  id: number;
  department: string;
  specialization: string;
  account: LecturerAccount;
}
export interface Class {
  id: number;
  classCode: string;
  totalStudent: number;
  description: string;
  lecturer: Lecturer;
  students: Student[];
}
export interface CourseElement {
  id: number;
  name: string;
  description: string;
  weight: number;
  elementType: number;
}
export interface AssignRequest {
  id: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  lecturer: Lecturer;
  courseElement: CourseElement;
  assignedAt: string | undefined;
  status?: number;
  assignedApproverLecturerId?: number;
}
export interface Course {
  id: number;
  name: string;
  description: string;
  code: string;
}
export interface SemesterCourse {
  id: number;
  semesterId: number;
  courseId: number;
  createdByHODAccountCode: string;
  createdAt: string;
  updatedAt: string;
  course: Course;
  courseElements: CourseElement[];
  classes: Class[];
  assignRequests: AssignRequest[];
}
export interface SemesterPlanDetail {
  id: number;
  semesterCode: string;
  academicYear: number;
  note: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  semesterCourses: SemesterCourse[];
}
export interface SemesterPlanDetailApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: SemesterPlanDetail;
}
export interface Semester {
  id: number;
  semesterCode: string;
  academicYear: number;
  note: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}
export interface SemesterListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: Semester[];
}
export interface GetSemestersParams {
  pageNumber: number;
  pageSize: number;
}
export interface SemesterApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: Semester;
}
export interface CreateSemesterPayload {
  semesterCode: string;
  academicYear: number;
  note: string;
  startDate: string;
  endDate: string;
}
export interface UpdateSemesterPayload {
  semesterCode: string;
  academicYear: number;
  note: string;
  startDate: string;
  endDate: string;
}
export class SemesterService {
  async getSemesterPlanDetail(
    semesterCode: string
  ): Promise<SemesterPlanDetail> {
    const response = await apiService.get<SemesterPlanDetailApiResponse>(
      `/Semester/${semesterCode}/plan-detail`
    );
    return response.result;
  }
  async getSemesters(params: GetSemestersParams): Promise<Semester[]> {
    const response = await apiService.get<SemesterListApiResponse>(
      "/Semester",
      { params: params }
    );
    return response.result;
  }
  async createSemester(payload: CreateSemesterPayload): Promise<Semester> {
    const response = await apiService.post<SemesterApiResponse>(
      "/Semester",
      payload
    );
    return response.result;
  }
  async updateSemester(
    semesterId: string | number,
    payload: UpdateSemesterPayload
  ): Promise<Semester> {
    const response = await apiService.put<SemesterApiResponse>(
      `/Semester/${semesterId}`,
      payload
    );
    return response.result;
  }
  async deleteSemester(semesterId: string | number): Promise<void> {
    await apiService.delete(`/Semester/${semesterId}`);
  }
}
export const semesterService = new SemesterService();