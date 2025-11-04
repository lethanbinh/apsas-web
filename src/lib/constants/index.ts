export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/Auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    FORGOT_PASSWORD: "/Auth/forgot-password",
    VERIFY_OTP: "/Auth/verify-otp",
    RESET_PASSWORD: "/Auth/reset-password",
    GOOGLE: "/Auth/google",
  },
  USER: {
    PROFILE: "/user/profile",
    UPDATE: "/user/update",
    GET_BY_ID: "/Account",
  },
  ACCOUNT: {
    PAGINATED_LIST: "/Account/page",
    UPDATE_PROFILE: "/Account",
  },
  ADMIN: {
    DELETE: "/Admin",
    UPDATE: "/Admin",
    CREATE: "/Account/create",
  },
  IMPORT: {
    EXCEL_TEMPLATE: "/Import/excel/template",
    SEMESTER_COURSE_DATA: "/Import/excel/semester-course-data",
    CLASS_STUDENT_DATA: "/Import/excel/class-student-data",
  },
  // --- SỬA LỖI: Chỉ giữ lại endpoint chung ---
  SEMESTER: {
    PAGINATED_LIST: "/Semester",
  },
  // --- KẾT THÚC SỬA LỖI ---
  HOD: {
    APPROVAL_LIST: "/AssignRequest/list",
    ASSIGN_REQUEST_UPDATE: "/AssignRequest",
    ASSESSMENT_TEMPLATE_LIST: "/AssessmentTemplate/list",
    ASSESSMENT_TEMPLATE_DETAIL: "/AssessmentTemplate",
    RUBRIC_ITEM_BY_QUESTION: "/RubricItem/question",
  },
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const STORAGE_KEYS = {
  TOKEN: "auth_token",
  USER: "user_data",
  THEME: "theme",
} as const;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  PROFILE: "/profile",
  DASHBOARD: "/dashboard",
  STUDENT_GRADE_LOOKUP: "/student",
  PE_LOGIN: "/pe",
  PE_SUBMISSION: "/pe/submission",
} as const;

export const ROLES = {
  ADMIN: 0,
  LECTURER: 1,
  STUDENT: 2,
  HOD: 3,
  EXAMINER: 4,
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface NavigationItem {
  key: string;
  label: string;
  href: string;
  requiredRole?: Role[];
}

export const ROLE_NAVIGATION: Record<Role, NavigationItem[]> = {
  [ROLES.STUDENT]: [
    { key: "home", label: "Home", href: "/home/student" },
    {
      key: "my-classes",
      label: "My Classes",
      href: "/classes/my-classes/student",
    },
    {
      key: "all-classes",
      label: "All Classes",
      href: "/search-classes/student",
    },
    {
      key: "grade-lookup",
      label: "Grade Lookup",
      href: "/student",
    },
  ],
  [ROLES.LECTURER]: [
    { key: "home", label: "Home", href: "/home/lecturer" },
    {
      key: "my-classes",
      label: "My Classes",
      href: "/classes/my-classes/lecturer",
    },
    {
      key: "all-classes",
      label: "All Classes",
      href: "/search-classes/lecturer",
    },
    {
      key: "tasks",
      label: "Tasks",
      href: "/lecturer/tasks",
    },
  ],
  [ROLES.ADMIN]: [
    { key: "dashboard", label: "Dashboard", href: "/admin/dashboard" },
    { key: "manage-users", label: "Manage Users", href: "/admin/manage-users" },
  ],
  [ROLES.HOD]: [
    {
      key: "semester-plans",
      label: "Semester Plans",
      href: "/hod/semester-plans",
    },
    { key: "approval", label: "Approval", href: "/hod/approval" },
  ],
  [ROLES.EXAMINER]: [
    {
      key: "exam-shifts",
      label: "Exam Shifts",
      href: "/examiner/exam-shifts",
    },
  ],
};

export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
} as const;
