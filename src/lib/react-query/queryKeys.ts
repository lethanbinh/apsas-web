/**
 * Centralized query keys for TanStack Query
 * 
 * This helps maintain consistency and avoid typos when using query keys
 * across the application. All query keys should be defined here.
 * 
 * Usage:
 *   queryClient.getQueryData(queryKeys.users.all)
 *   queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) })
 */

export const queryKeys = {
  // User/Account related queries
  users: {
    all: ['users'] as const,
    lists: () => ['users', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['users', 'list', filters] as const,
    details: () => ['users', 'detail'] as const,
    detail: (id: number | string) => ['users', 'detail', id] as const,
  },

  // Class related queries
  classes: {
    all: ['classes'] as const,
    lists: () => ['classes', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['classes', 'list', filters] as const,
    details: () => ['classes', 'detail'] as const,
    detail: (id: number | string) => ['classes', 'detail', id] as const,
  },

  // Assessment/Template related queries
  assessments: {
    all: ['assessments'] as const,
    templates: {
      all: ['assessments', 'templates'] as const,
      lists: () => ['assessments', 'templates', 'list'] as const,
      list: (filters: Record<string, unknown>) => ['assessments', 'templates', 'list', filters] as const,
      details: () => ['assessments', 'templates', 'detail'] as const,
      detail: (id: number | string) => ['assessments', 'templates', 'detail', id] as const,
    },
  },

  // Submission related queries
  submissions: {
    all: ['submissions'] as const,
    lists: () => ['submissions', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['submissions', 'list', filters] as const,
    details: () => ['submissions', 'detail'] as const,
    detail: (id: number | string) => ['submissions', 'detail', id] as const,
  },

  // Grading related queries
  grading: {
    all: ['grading'] as const,
    sessions: {
      all: ['grading', 'sessions'] as const,
      lists: () => ['grading', 'sessions', 'list'] as const,
      list: (filters: Record<string, unknown>) => ['grading', 'sessions', 'list', filters] as const,
      details: () => ['grading', 'sessions', 'detail'] as const,
      detail: (id: number | string) => ['grading', 'sessions', 'detail', id] as const,
    },
    groups: {
      all: ['grading', 'groups'] as const,
      lists: () => ['grading', 'groups', 'list'] as const,
      list: (filters: Record<string, unknown>) => ['grading', 'groups', 'list', filters] as const,
      details: () => ['grading', 'groups', 'detail'] as const,
      detail: (id: number | string) => ['grading', 'groups', 'detail', id] as const,
    },
  },

  // Course element related queries
  courseElements: {
    all: ['courseElements'] as const,
    lists: () => ['courseElements', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['courseElements', 'list', filters] as const,
    details: () => ['courseElements', 'detail'] as const,
    detail: (id: number | string) => ['courseElements', 'detail', id] as const,
  },

  // Semester related queries
  semesters: {
    all: ['semesters'] as const,
    lists: () => ['semesters', 'list'] as const,
    list: (filters?: Record<string, unknown>) => ['semesters', 'list', filters || {}] as const,
    details: () => ['semesters', 'detail'] as const,
    detail: (semesterCode: string) => ['semesters', 'detail', semesterCode] as const,
  },

  // Lecturer related queries
  lecturers: {
    all: ['lecturers'] as const,
    lists: () => ['lecturers', 'list'] as const,
    list: () => ['lecturers', 'list'] as const,
  },

  // Student classes related queries
  studentClasses: {
    all: ['studentClasses'] as const,
    lists: () => ['studentClasses', 'list'] as const,
    byStudentId: (studentId: number) => ['studentClasses', 'list', 'byStudentId', studentId] as const,
  },

  // Lecturer classes related queries
  lecturerClasses: {
    all: ['lecturerClasses'] as const,
    lists: () => ['lecturerClasses', 'list'] as const,
    byLecturerId: (lecturerId: number) => ['lecturerClasses', 'list', 'byLecturerId', lecturerId] as const,
  },

  // Assign requests related queries
  assignRequests: {
    all: ['assignRequests'] as const,
    lists: () => ['assignRequests', 'list'] as const,
    byLecturerId: (lecturerId: number) => ['assignRequests', 'list', 'byLecturerId', lecturerId] as const,
  },

  // Assessment templates related queries
  assessmentTemplates: {
    all: ['assessmentTemplates'] as const,
    lists: () => ['assessmentTemplates', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['assessmentTemplates', 'list', filters] as const,
    details: () => ['assessmentTemplates', 'detail'] as const,
    detail: (id: number | string) => ['assessmentTemplates', 'detail', id] as const,
    byCourseElementId: (courseElementId: number) => ['assessmentTemplates', 'list', 'byCourseElementId', courseElementId] as const,
  },

  // Assessment questions related queries
  assessmentQuestions: {
    all: ['assessmentQuestions'] as const,
    lists: () => ['assessmentQuestions', 'list'] as const,
    byPaperId: (paperId: number) => ['assessmentQuestions', 'list', 'byPaperId', paperId] as const,
    details: () => ['assessmentQuestions', 'detail'] as const,
    detail: (id: number | string) => ['assessmentQuestions', 'detail', id] as const,
  },

  // Rubric items related queries
  rubricItems: {
    all: ['rubricItems'] as const,
    lists: () => ['rubricItems', 'list'] as const,
    byQuestionId: (questionId: number) => ['rubricItems', 'list', 'byQuestionId', questionId] as const,
    details: () => ['rubricItems', 'detail'] as const,
    detail: (id: number | string) => ['rubricItems', 'detail', id] as const,
  },

  // Assessment papers related queries
  assessmentPapers: {
    all: ['assessmentPapers'] as const,
    lists: () => ['assessmentPapers', 'list'] as const,
    byTemplateId: (templateId: number) => ['assessmentPapers', 'list', 'byTemplateId', templateId] as const,
    details: () => ['assessmentPapers', 'detail'] as const,
    detail: (id: number | string) => ['assessmentPapers', 'detail', id] as const,
  },

  // Assessment files related queries
  assessmentFiles: {
    all: ['assessmentFiles'] as const,
    lists: () => ['assessmentFiles', 'list'] as const,
    byTemplateId: (templateId: number) => ['assessmentFiles', 'list', 'byTemplateId', templateId] as const,
  },

  // Class assessments related queries
  classAssessments: {
    all: ['classAssessments'] as const,
    lists: () => ['classAssessments', 'list'] as const,
    list: (filters: Record<string, unknown>) => ['classAssessments', 'list', filters] as const,
    details: () => ['classAssessments', 'detail'] as const,
    detail: (id: number | string) => ['classAssessments', 'detail', id] as const,
    byClassId: (classId: number | string) => ['classAssessments', 'list', 'byClassId', classId] as const,
  },

  // Students in class related queries
  studentsInClass: {
    all: ['studentsInClass'] as const,
    byClassId: (classId: number | string) => ['studentsInClass', 'byClassId', classId] as const,
  },

  // Student detail related queries
  studentDetail: {
    all: ['studentDetail'] as const,
    byStudentId: (studentId: number | string) => ['studentDetail', 'byStudentId', studentId] as const,
  },
} as const;
