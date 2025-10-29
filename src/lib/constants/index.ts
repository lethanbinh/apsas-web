/**
 * Application constants
 */

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/Auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/Auth/forgot-password',
    VERIFY_OTP: '/Auth/verify-otp',
    RESET_PASSWORD: '/Auth/reset-password',
    GOOGLE: '/Auth/google',
  },
  USER: {
    PROFILE: '/user/profile',
    UPDATE: '/user/update',
    GET_BY_ID: '/Account',
  },
  ACCOUNT: {
    PAGINATED_LIST: '/Account/page',
  },
  ADMIN: {
    DELETE: '/Admin',
    UPDATE: '/Admin',
    CREATE: '/Admin/create',
  },
  IMPORT: {
    EXCEL_TEMPLATE: '/Import/excel/template',
    SEMESTER_COURSE_DATA: '/Import/excel/semester-course-data',
    CLASS_STUDENT_DATA: '/Import/excel/class-student-data',
  },
  SEMESTER: {
    PAGINATED_LIST: '/Semester',
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_data',
  THEME: 'theme',
} as const;

// Route Paths
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  DASHBOARD: '/dashboard',
} as const;

// Role Constants
export const ROLES = {
  STUDENT: 0,
  LECTURER: 1,
  ADMIN: 2,
  HOD: 3,
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Navigation items based on role
export interface NavigationItem {
  key: string;
  label: string;
  href: string;
  requiredRole?: Role[];
}

export const ROLE_NAVIGATION: Record<Role, NavigationItem[]> = {
  [ROLES.STUDENT]: [
    { key: 'home', label: 'Trang chủ', href: '/home' },
    { key: 'my-classes', label: 'Lớp của tôi', href: '/classes/my-classes' },
    { key: 'all-classes', label: 'Tất cả lớp học', href: '/search-classes' },
  ],
  [ROLES.LECTURER]: [
    { key: 'home', label: 'Trang chủ', href: '/home' },
    { key: 'dashboard', label: 'Dashboard', href: '/lecturer/dashboard' },
    { key: 'tasks', label: 'Nhiệm vụ', href: '/lecturer/tasks' },
    { key: 'grading-history', label: 'Lịch sử chấm', href: '/lecturer/grading-history' },
  ],
  [ROLES.ADMIN]: [
    { key: 'home', label: 'Trang chủ', href: '/home' },
    { key: 'dashboard', label: 'Dashboard', href: '/admin/dashboard' },
    { key: 'manage-users', label: 'Quản lý người dùng', href: '/admin/manage-users' },
  ],
  [ROLES.HOD]: [
    { key: 'home', label: 'Trang chủ', href: '/home' },
    { key: 'semester-plans', label: 'Kế hoạch học kỳ', href: '/hod/semester-plans' },
    { key: 'approval', label: 'Phê duyệt', href: '/hod/approval' },
  ],
};

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
} as const;
