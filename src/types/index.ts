/**
 * TypeScript type definitions
 */

// User Types
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
}

// Interface for user update payload (including optional password)
export interface UserUpdatePayload extends Partial<Omit<User, 'id'>> {
  password?: string;
}

// Interface for a simpler User object that might not include all fields (e.g., without password) for display
// export interface UserDisplay extends Omit<User, 'password'> {}

export type UserRole = 'admin' | 'hod' | 'teacher' | 'student';

// Auth Types
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

// Password Reset Types
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
  }
 }
// API Response Types
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

export interface AccountListResponse {
  statusCode: number;
  isSuccess: boolean;
  errorMessages: string[];
  result: PaginatedResponse<User>; // Updated to PaginatedResponse<User>
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

// Theme Types
export type Theme = 'light' | 'dark';

export interface ThemeConfig {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  border: string;
}
