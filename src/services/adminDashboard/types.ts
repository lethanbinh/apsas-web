export interface DashboardOverview {
  users: UserStats;
  academic: AcademicStats;
  assessments: AssessmentStats;
  submissions: SubmissionStats;
  grading: GradingStats;
  grades: GradeStats;
}

export interface UserStats {
  total: number;
  byRole: {
    admin: number;
    lecturer: number;
    student: number;
    hod: number;
  };
  newThisMonth: number;
  active: number;
  inactive: number;
  neverLoggedIn: number;

  byGender: {
    male: number;
    female: number;
    other: number;
  };
  averageAge?: number;
  usersWithAvatar: number;
  usersWithoutAvatar: number;
  usersWithPhone: number;
  usersWithoutPhone: number;
  topUsersByActivity?: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    activityCount: number;
  }>;
}

export interface AcademicStats {
  totalSemesters: number;
  activeSemesters: number;
  totalClasses: number;
  totalCourseElements: number;
  totalCourses: number;
  totalStudents: number;
  totalLecturers: number;
  classesOverloaded: number;

  classesBySemester: Array<{
    semesterCode: string;
    semesterName: string;
    classCount: number;
    studentCount: number;
    lecturerCount: number;
  }>;
  averageStudentsPerClass: number;
  classesWithoutStudents: number;
  topClassesByStudents: Array<{
    id: number;
    classCode: string;
    courseName: string;
    studentCount: number;
    lecturerName: string;
  }>;
  semesterCourses: number;
  lecturerWorkload: Array<{
    lecturerId: string;
    lecturerName: string;
    classCount: number;
    studentCount: number;
  }>;
  studentToLecturerRatio: number;
}

export interface AssessmentStats {
  totalTemplates: number;
  totalClassAssessments: number;
  byType: {
    assignment: number;
    lab: number;
    practicalExam: number;
  };

  assessmentsByStatus: {
    active: number;
    completed: number;
    pending: number;
  };
  assessmentsByLecturer: Array<{
    lecturerId: number;
    lecturerName: string;
    count: number;
  }>;
  averageSubmissionsPerAssessment: number;
  assessmentsWithoutSubmissions: number;
  topAssessmentsBySubmissions: Array<{
    id: number;
    name: string;
    courseName: string;
    submissionCount: number;
    lecturerName: string;
  }>;
  upcomingDeadlines: Array<{
    id: number;
    name: string;
    endAt: string;
    daysRemaining: number;
  }>;
}

export interface SubmissionStats {
  total: number;
  graded: number;
  pending: number;
  notSubmitted: number;
  completionRate: number;

  submissionsByType: {
    assignment: number;
    lab: number;
    practicalExam: number;
  };
  averageGrade: number;
  submissionsByGradeRange: {
    excellent: number;
    good: number;
    average: number;
    belowAverage: number;
  };
  lateSubmissions: number;
  onTimeSubmissions: number;
  topStudentsBySubmissions: Array<{
    studentId: number;
    studentName: string;
    studentCode: string;
    submissionCount: number;
    averageGrade: number;
  }>;
  submissionsByDay: Array<{
    date: string;
    count: number;
  }>;
}

export interface GradingStats {
  totalGradingGroups: number;
  totalGradingSessions: number;
  pendingAssignRequests: number;
  completedGradingSessions: number;

  gradingSessionsByStatus: {
    processing: number;
    completed: number;
    failed: number;
  };
  gradingSessionsByType: {
    ai: number;
    lecturer: number;
    both: number;
  };
  averageGradingTime?: number;
  gradingByLecturer: Array<{
    lecturerId: number;
    lecturerName: string;
    sessionCount: number;
    completedCount: number;
  }>;
  pendingAssignRequestsByLecturer: Array<{
    lecturerId: number;
    lecturerName: string;
    requestCount: number;
  }>;
  gradingGroupsByStatus: {
    active: number;
    completed: number;
  };
}

export interface ChartData {
  userGrowth: UserGrowthData[];
  semesterActivity: SemesterActivityData[];
  assessmentDistribution: AssessmentDistributionData[];
  submissionStatus: SubmissionStatusData[];
  gradingPerformance: GradingPerformanceData[];
}

export interface UserGrowthData {
  month: string;
  total: number;
  students: number;
  lecturers: number;
}

export interface SemesterActivityData {
  semester: string;
  courses: number;
  classes: number;
  assessments: number;
  submissions: number;
}

export interface AssessmentDistributionData {
  type: string;
  count: number;
}

export interface SubmissionStatusData {
  status: string;
  count: number;
}

export interface GradingPerformanceData {
  date: string;
  graded: number;
  pending: number;
}

export interface RecentActivity {
  id: string;
  type: 'user' | 'class' | 'assessment' | 'submission' | 'grading';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export interface PendingTask {
  id: string;
  type: 'assign_request' | 'submission' | 'grading';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
}

export interface GradeStats {
  totalGraded: number;
  averageGrade: number;
  medianGrade: number;
  gradeDistribution: {
    excellent: number; // >= 8.5
    good: number; // 7.0 - 8.4
    average: number; // 5.5 - 6.9
    belowAverage: number; // < 5.5
  };
  averageGradeByType: {
    assignment: number;
    lab: number;
    practicalExam: number;
  };
  averageGradeByClass: Array<{
    classId: number;
    classCode: string;
    courseName: string;
    averageGrade: number;
    studentCount: number;
    gradedCount: number;
  }>;
  gradeDistributionChart: Array<{
    range: string;
    count: number;
  }>;
  gradingCompletionRate: number;
  topClassesByAverage: Array<{
    classId: number;
    classCode: string;
    courseName: string;
    averageGrade: number;
  }>;
  bottomClassesByAverage: Array<{
    classId: number;
    classCode: string;
    courseName: string;
    averageGrade: number;
  }>;
}

