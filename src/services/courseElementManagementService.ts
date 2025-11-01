import { apiService } from "./api";
export interface CourseElementBasic {
  id: number;
  name: string;
  description: string;
  weight: number;
  semesterCourseId: number;
  createdAt: string;
  updatedAt: string;
  semesterCourse: null;
}

export interface CourseElementBasicApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: CourseElementBasic;
}

export interface CreateCourseElementPayload {
  name: string;
  description: string;
  weight: number;
  semesterCourseId: number;
}

export interface UpdateCourseElementPayload {
  name: string;
  description: string;
  weight: number;
}

export class CourseElementManagementService {
  async createCourseElement(
    payload: CreateCourseElementPayload
  ): Promise<CourseElementBasic> {
    const response = await apiService.post<CourseElementBasicApiResponse>(
      "/CourseElements",
      payload
    );
    return response.result;
  }

  async updateCourseElement(
    courseElementsId: string | number,
    payload: UpdateCourseElementPayload
  ): Promise<CourseElementBasic> {
    const response = await apiService.put<CourseElementBasicApiResponse>(
      `/CourseElements/${courseElementsId}`,
      payload
    );
    return response.result;
  }

  async deleteCourseElement(courseElementsId: string | number): Promise<void> {
    await apiService.delete(`/CourseElements/${courseElementsId}`);
  }
}

export const courseElementManagementService =
  new CourseElementManagementService();
