import { apiService } from "./api";
export interface CreateCoursePayload {
  name: string;
  description: string;
  code: string;
}

export interface UpdateCoursePayload {
  name: string;
  description: string;
  code: string;
}

export interface Course {
  id: number;
  name: string;
  description: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: Course;
}

export interface CreateSemesterCoursePayload {
  semesterId: number;
  courseId: number;
  createdByHODId: number;
}

export interface UpdateSemesterCoursePayload {
  semesterId: number;
  courseId: number;
}

export interface SemesterCourseBasic {
  id: number;
  semesterId: number;
  courseId: number;
  createdByHODId: number;
  createdAt: string;
  updatedAt: string;
}

export interface SemesterCourseBasicApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: SemesterCourseBasic;
}

export class CourseService {
  async createCourse(payload: CreateCoursePayload): Promise<Course> {
    const response = await apiService.post<CourseApiResponse>(
      "/Course",
      payload
    );
    return response.result;
  }

  async updateCourse(
    courseId: string | number,
    payload: UpdateCoursePayload
  ): Promise<Course> {
    const response = await apiService.put<CourseApiResponse>(
      `/Course/${courseId}`,
      payload
    );
    return response.result;
  }

  async deleteCourse(courseId: string | number): Promise<void> {
    await apiService.delete(`/Course/${courseId}`);
  }
}

export class SemesterCourseService {
  async createSemesterCourse(
    payload: CreateSemesterCoursePayload
  ): Promise<SemesterCourseBasic> {
    const response = await apiService.post<SemesterCourseBasicApiResponse>(
      "/SemesterCourse",
      payload
    );
    return response.result;
  }

  async updateSemesterCourse(
    semesterCourseId: string | number,
    payload: UpdateSemesterCoursePayload
  ): Promise<SemesterCourseBasic> {
    const response = await apiService.put<SemesterCourseBasicApiResponse>(
      `/SemesterCourse/${semesterCourseId}`,
      payload
    );
    return response.result;
  }

  async deleteSemesterCourse(semesterCourseId: string | number): Promise<void> {
    await apiService.delete(`/SemesterCourse/${semesterCourseId}`);
  }
}

export const courseService = new CourseService();
export const semesterCourseService = new SemesterCourseService();
