export interface User {
  id: number;
  accountCode: string;
  username: string;
  email: string;
  phoneNumber: string;
  fullName: string;
  avatar?: string;
  address: string;
  gender: number;
  dateOfBirth: string;
  role: number;
  createdAt?: string;
  updatedAt?: string;
}
export interface UserUpdatePayload extends Partial<Omit<User, 'id'>> {
  password?: string;
}
export type UserRole = 'admin' | 'hod' | 'teacher' | 'student';
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  refreshToken: string | null;
}
export interface LoginCredentials {
  email: string;
  password: string;
}
export interface RegisterData {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
}
export interface ForgotPasswordRequest {
  email: string;
}
export interface VerifyOtpRequest {
  email: string;
  otp: string;
}
export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}
export interface GoogleLoginRequest {
  idToken: string;
}
 export interface GoogleLoginResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: string[];
  result: {
    token: string;
    refreshToken: string;
    expiresAt: string;
    message: string;
  }
 }
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  errors?: string[];
}
export interface PaginatedResponse<T> {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: T[];
}
export interface SingleResponse<T> {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: string[];
  result: T;
}
export interface ListResponse<T> {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: string[];
  result: T[];
}
interface GetPaginatedSemestersResponse {
  semesters: Semester[];
  total: number;
}
export interface AccountListResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: string[];
  result: PaginatedResponse<User>;
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
export enum AssignRequestStatus {
  PENDING = 1,
  ACCEPTED = 2,
  REJECTED = 3,
  IN_PROGRESS = 4,
  COMPLETED = 5,
}
export interface ApiApprovalItem {
  id: number;
  message: string;
  status: number;
  assignedAt: string;
  courseElementId: number;
  assignedLecturerId: number;
  assignedByHODId: number;
  assignedApproverLecturerId?: number;
  assignedApproverLecturerName?: string;
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
export interface ApiAssignRequestUpdatePayload {
  message: string;
  courseElementId: number;
  assignedLecturerId: number;
  assignedByHODId: number;
  assignedApproverLecturerId: number;
  status: number;
  assignedAt: string;
}
export interface ApprovalListResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: string[];
  result: PaginatedResponse<ApiApprovalItem>;
}
export interface ApiRubricItem {
  id: number;
  description: string;
  input: string;
  output: string;
  assessmentQuestionId: number;
  questionText: string;
  createdAt: string;
  updatedAt: string;
  name?: string;
  score?: number;
}
export interface ApiAssessmentQuestion {
  id: number;
  questionText: string;
  questionSampleInput: string;
  questionSampleOutput: string;
  score: number;
  rubricCount: number;
}
export interface ApiAssessmentPaper {
  id: number;
  name: string;
  description: string;
  questionCount: number;
  questions: ApiAssessmentQuestion[];
}
export interface ApiTemplateFile {
  id: number;
  name: string;
  fileUrl: string;
  fileTemplate: number;
}
export interface ApiAssessmentTemplate {
  id: number;
  assignRequestId: number;
  templateType: number;
  name: string;
  description: string;
  createdByLecturerId: number;
  lecturerName: string;
  lecturerCode: string;
  assignedToHODId: number;
  hodName: string;
  hodCode: string;
  courseElementId: number;
  courseElementName: string;
  createdAt: string;
  updatedAt: string;
  files: ApiTemplateFile[];
  papers: ApiAssessmentPaper[];
  status: number;
}
export type AssessmentTemplateListResponse = SingleResponse<PaginatedResponse<ApiAssessmentTemplate>>;
export type AssessmentTemplateDetailResponse = SingleResponse<ApiAssessmentTemplate>;
export type RubricItemListResponse = ListResponse<ApiRubricItem>;
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}
export type Theme = 'light' | 'dark';
export interface ThemeConfig {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  border: string;
}