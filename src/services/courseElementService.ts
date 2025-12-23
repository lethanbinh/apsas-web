import { apiService } from "./api";
export interface Course {
  id: number;
  name: string;
  code: string;
  description: string;
}
export interface Semester {
  id: number;
  semesterCode: string;
  academicYear: number;
  startDate: string;
  endDate: string;
}
export interface SemesterCourse {
  id: number;
  semesterId: number;
  courseId: number;
  createdByHODAccountCode: string;
  course: Course;
  semester: Semester;
}
export interface CourseElement {
  id: number;
  name: string;
  description: string;
  weight: number;
  elementType: number;
  semesterCourseId: number;
  createdAt: string;
  updatedAt: string;
  semesterCourse: SemesterCourse;
}
export interface CourseElementListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: CourseElement[];
}
export interface GetCourseElementsParams {
  pageNumber: number;
  pageSize: number;
  semesterCode?: string;
}
export class CourseElementService {
  async getCourseElements(
    params: GetCourseElementsParams
  ): Promise<CourseElement[]> {
    const response = await apiService.get<CourseElementListApiResponse>(
      "/CourseElements",
      { params: params }
    );
    return response.result;
  }
}
export const courseElementService = new CourseElementService();