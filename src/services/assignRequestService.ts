import { apiService } from "./api";
export interface AssignRequestItem {
  id: number;
  message: string;
  status: number;
  assignedAt: string;
  courseElementId: number;
  assignedLecturerId: number;
  assignedByHODId: number;
  createdAt: string;
  updatedAt: string;
  courseElementName: string;
  courseElementDescription: string;
  courseName: string;
  semesterName: string;
  assignedLecturerName: string;
  assignedLecturerDepartment: string;
  assignedByHODName: string;
}

export interface AssignRequestListResult {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: AssignRequestItem[];
}

export interface AssignRequestListApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssignRequestListResult;
}

export interface GetAssignRequestParams {
  lecturerId?: number;
  assignedByHODId?: number;
  courseElementId?: number;
  semesterCode?: string;
  pageNumber: number;
  pageSize: number;
}
export interface GetAssignRequestResponse {
  items: AssignRequestItem[];
  total: number;
}

export interface AssignRequestApiResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: any[];
  result: AssignRequestItem;
}

export interface CreateAssignRequestPayload {
  message: string;
  courseElementId: number;
  assignedLecturerId: number;
  assignedByHODId: number;
  status: number;
  assignedAt: string;
}

export interface UpdateAssignRequestPayload {
  message: string;
  courseElementId: number;
  assignedLecturerId: number;
  assignedByHODId: number;
  status: number;
  assignedAt: string;
}

export class AssignRequestService {
  async getAssignRequests(
    params: GetAssignRequestParams
  ): Promise<GetAssignRequestResponse> {
    const response = await apiService.get<AssignRequestListApiResponse>(
      "/AssignRequest/list",
      { params: params }
    );
    return {
      items: response.result.items,
      total: response.result.totalCount,
    };
  }

  async createAssignRequest(
    payload: CreateAssignRequestPayload
  ): Promise<AssignRequestItem> {
    const response = await apiService.post<AssignRequestApiResponse>(
      "/AssignRequest/create",
      payload
    );
    return response.result;
  }

  async updateAssignRequest(
    assignRequestId: string | number,
    payload: UpdateAssignRequestPayload
  ): Promise<AssignRequestItem> {
    const response = await apiService.put<AssignRequestApiResponse>(
      `/AssignRequest/${assignRequestId}`,
      payload
    );
    return response.result;
  }

  async deleteAssignRequest(assignRequestId: string | number): Promise<void> {
    await apiService.delete(`/AssignRequest/${assignRequestId}`);
  }
}

export const assignRequestService = new AssignRequestService();
