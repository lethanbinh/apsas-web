import { ROLES } from '@/lib/constants';
import { adminService } from './adminService';
import { classAssessmentService } from './classAssessmentService';
import { classService } from './classService';
import { courseElementService } from './courseElementService';
import { gradingGroupService } from './gradingGroupService';
import { gradingService } from './gradingService';
import { submissionService } from './submissionService';

export interface DashboardOverview {
  users: UserStats;
  academic: AcademicStats;
  assessments: AssessmentStats;
  submissions: SubmissionStats;
  grading: GradingStats;
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
  inactive: number; // Haven't logged in >30 days
  neverLoggedIn: number; // Never logged in
  // Detailed stats
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
  classesOverloaded: number; // >50 students
  // Detailed stats
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
  // Detailed stats
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
  // Detailed stats
  submissionsByType: {
    assignment: number;
    lab: number;
    practicalExam: number;
  };
  averageGrade: number;
  submissionsByGradeRange: {
    excellent: number; // >= 8.5
    good: number; // 7.0 - 8.4
    average: number; // 5.5 - 6.9
    belowAverage: number; // < 5.5
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
  // Detailed stats
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
  averageGradingTime?: number; // in hours
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

export class AdminDashboardService {
  /**
   * Get comprehensive dashboard overview
   */
  async getDashboardOverview(): Promise<DashboardOverview> {
    try {
      // Fetch all data in parallel
      const [
        usersData,
        semestersData,
        classesData,
        assessmentsData,
        submissionsData,
        gradingGroupsData,
        gradingSessionsData,
        assignRequestsData,
      ] = await Promise.allSettled([
        this.getUserStats(),
        this.getSemesterStats(),
        this.getClassStats(),
        this.getAssessmentStats(),
        this.getSubmissionStats(),
        this.getGradingGroupStats(),
        this.getGradingSessionStats(),
        this.getAssignRequestStats(),
      ]);

      const users = usersData.status === 'fulfilled' ? usersData.value : this.getDefaultUserStats();

      // Get detailed academic stats
      const academicDetailed = await this.getDetailedAcademicStats();
      const academic: AcademicStats = {
        totalSemesters: semestersData.status === 'fulfilled' ? semestersData.value.total : 0,
        activeSemesters: semestersData.status === 'fulfilled' ? semestersData.value.active : 0,
        totalClasses: classesData.status === 'fulfilled' ? classesData.value.total : 0,
        totalCourseElements: academicDetailed.totalCourseElements || 0,
        totalCourses: academicDetailed.totalCourses || 0,
        totalStudents: academicDetailed.totalStudents || 0,
        totalLecturers: academicDetailed.totalLecturers || 0,
        classesOverloaded: academicDetailed.classesOverloaded || 0,
        classesBySemester: academicDetailed.classesBySemester || [],
        averageStudentsPerClass: academicDetailed.averageStudentsPerClass || 0,
        classesWithoutStudents: academicDetailed.classesWithoutStudents || 0,
        topClassesByStudents: academicDetailed.topClassesByStudents || [],
        semesterCourses: academicDetailed.semesterCourses || 0,
        lecturerWorkload: academicDetailed.lecturerWorkload || [],
        studentToLecturerRatio: academicDetailed.studentToLecturerRatio || 0,
      };

      // Get detailed assessment stats
      const assessmentDetailed = await this.getDetailedAssessmentStats();
      const baseAssessments = assessmentsData.status === 'fulfilled' ? assessmentsData.value : this.getDefaultAssessmentStats();
      const assessments: AssessmentStats = {
        ...baseAssessments,
        assessmentsByStatus: assessmentDetailed.assessmentsByStatus || { active: 0, completed: 0, pending: 0 },
        assessmentsByLecturer: assessmentDetailed.assessmentsByLecturer || [],
        averageSubmissionsPerAssessment: assessmentDetailed.averageSubmissionsPerAssessment || 0,
        assessmentsWithoutSubmissions: assessmentDetailed.assessmentsWithoutSubmissions || 0,
        topAssessmentsBySubmissions: assessmentDetailed.topAssessmentsBySubmissions || [],
        upcomingDeadlines: assessmentDetailed.upcomingDeadlines || [],
      };

      const submissions = submissionsData.status === 'fulfilled' ? submissionsData.value : this.getDefaultSubmissionStats();

      // Get detailed grading stats
      const gradingDetailed = await this.getDetailedGradingStats();
      const grading: GradingStats = {
        totalGradingGroups: gradingGroupsData.status === 'fulfilled' ? gradingGroupsData.value.total : 0,
        totalGradingSessions: gradingSessionsData.status === 'fulfilled' ? gradingSessionsData.value.total : 0,
        pendingAssignRequests: assignRequestsData.status === 'fulfilled' ? assignRequestsData.value.pending : 0,
        completedGradingSessions: gradingSessionsData.status === 'fulfilled' ? gradingSessionsData.value.completed : 0,
        gradingSessionsByStatus: gradingDetailed.gradingSessionsByStatus || { processing: 0, completed: 0, failed: 0 },
        gradingSessionsByType: gradingDetailed.gradingSessionsByType || { ai: 0, lecturer: 0, both: 0 },
        averageGradingTime: gradingDetailed.averageGradingTime,
        gradingByLecturer: gradingDetailed.gradingByLecturer || [],
        pendingAssignRequestsByLecturer: gradingDetailed.pendingAssignRequestsByLecturer || [],
        gradingGroupsByStatus: gradingDetailed.gradingGroupsByStatus || { active: 0, completed: 0 },
      };

      return {
        users,
        academic,
        assessments,
        submissions,
        grading,
      };
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  private async getUserStats(): Promise<UserStats> {
    try {
      // Fetch all users (with pagination if needed)
      const { users, total } = await adminService.getAccountList(1, 1000);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const byRole = {
        admin: 0,
        lecturer: 0,
        student: 0,
        hod: 0,
      };

      let newThisMonth = 0;
      let active = 0;

      // Filter out examiner accounts (role 4) before counting
      const filteredUsers = users.filter((user) => user.role !== 4);

      filteredUsers.forEach((user) => {
        // Count by role
        if (user.role === ROLES.ADMIN) byRole.admin++;
        else if (user.role === ROLES.LECTURER) byRole.lecturer++;
        else if (user.role === ROLES.STUDENT) byRole.student++;
        else if (user.role === ROLES.HOD) byRole.hod++;

        // Count active (assuming all users in list are active)
        active++;
      });

      // Note: newThisMonth calculation would require createdAt field in User interface
      // For now, we'll set it to 0 or calculate from a different source if available

      // Calculate detailed stats
      const byGender = {
        male: 0,
        female: 0,
        other: 0,
      };
      let totalAge = 0;
      let ageCount = 0;
      let usersWithAvatar = 0;
      let usersWithoutAvatar = 0;
      let usersWithPhone = 0;
      let usersWithoutPhone = 0;
      let inactive = 0;
      let neverLoggedIn = 0;

      filteredUsers.forEach((user) => {
        // Count by gender
        if (user.gender === 0) byGender.male++;
        else if (user.gender === 1) byGender.female++;
        else byGender.other++;

        // Count avatars
        if (user.avatar) usersWithAvatar++;
        else usersWithoutAvatar++;

        // Count phone numbers
        if (user.phoneNumber && user.phoneNumber.trim() !== '') usersWithPhone++;
        else usersWithoutPhone++;

        // Calculate age if dateOfBirth is available
        if (user.dateOfBirth) {
          try {
            const birthDate = new Date(user.dateOfBirth);
            const age = now.getFullYear() - birthDate.getFullYear();
            if (age > 0 && age < 100) {
              totalAge += age;
              ageCount++;
            }
          } catch (e) {
            // Invalid date
          }
        }

        // Note: inactive and neverLoggedIn would require lastLoginDate field
        // For now, we'll set them to 0 or calculate from a different source if available
      });

      const averageAge = ageCount > 0 ? Math.round(totalAge / ageCount) : undefined;

      return {
        total: filteredUsers.length, // Exclude examiner accounts from total
        byRole,
        newThisMonth,
        active,
        inactive,
        neverLoggedIn,
        byGender,
        averageAge,
        usersWithAvatar,
        usersWithoutAvatar,
        usersWithPhone,
        usersWithoutPhone,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return this.getDefaultUserStats();
    }
  }

  /**
   * Get semester statistics
   */
  private async getSemesterStats(): Promise<{ total: number; active: number }> {
    try {
      const semesters = await adminService.getPaginatedSemesters(1, 100);
      const now = new Date();

      const active = semesters.filter((semester) => {
        const startDate = new Date(semester.startDate);
        const endDate = new Date(semester.endDate);
        return now >= startDate && now <= endDate;
      }).length;

      return {
        total: semesters.length,
        active,
      };
    } catch (error) {
      console.error('Error fetching semester stats:', error);
      return { total: 0, active: 0 };
    }
  }

  /**
   * Get class statistics
   */
  private async getClassStats(): Promise<{ total: number }> {
    try {
      const { total } = await classService.getClassList({
        pageNumber: 1,
        pageSize: 1,
      });
      return { total };
    } catch (error) {
      console.error('Error fetching class stats:', error);
      return { total: 0 };
    }
  }

  /**
   * Helper function to check if assessment template is a Practical Exam based on name
   */
  private isPracticalExamTemplate(template: any): boolean {
    const name = (template.name || "").toLowerCase();
    const keywords = [
      "exam",
      "pe",
      "practical exam",
      "practical",
      "test",
      "kiểm tra thực hành",
      "thi thực hành",
      "bài thi",
      "bài kiểm tra",
    ];
    return keywords.some((keyword) => name.includes(keyword));
  }

  /**
   * Helper function to check if assessment template is a Lab based on name
   */
  private isLabTemplate(template: any): boolean {
    const name = (template.name || "").toLowerCase();
    const keywords = [
      "lab",
      "laboratory",
      "thực hành",
      "bài thực hành",
      "lab session",
      "lab work",
    ];
    return keywords.some((keyword) => name.includes(keyword));
  }

  /**
   * Get assessment statistics
   */
  private async getAssessmentStats(): Promise<AssessmentStats> {
    try {
      const templates = await adminService.getAssessmentTemplateList(1, 1000);
      const assessments = await classAssessmentService.getClassAssessments({
        pageNumber: 1,
        pageSize: 1000,
      });

      // Count by type - check by name instead of templateType
      const byType = {
        assignment: 0,
        lab: 0,
        practicalExam: 0,
      };

      templates.items.forEach((template) => {
        if (this.isPracticalExamTemplate(template)) {
          byType.practicalExam++;
        } else if (this.isLabTemplate(template)) {
          byType.lab++;
        } else {
          byType.assignment++;
        }
      });

      return {
        totalTemplates: templates.totalCount,
        totalClassAssessments: assessments.total,
        byType,
        assessmentsByStatus: { active: 0, completed: 0, pending: 0 },
        assessmentsByLecturer: [],
        averageSubmissionsPerAssessment: 0,
        assessmentsWithoutSubmissions: 0,
        topAssessmentsBySubmissions: [],
        upcomingDeadlines: [],
      };
    } catch (error) {
      console.error('Error fetching assessment stats:', error);
      return this.getDefaultAssessmentStats();
    }
  }

  /**
   * Get submission statistics
   */
  private async getSubmissionStats(): Promise<SubmissionStats> {
    try {
      const submissions = await submissionService.getSubmissionList({});
      const assessments = await classAssessmentService.getClassAssessments({
        pageNumber: 1,
        pageSize: 1000,
      });
      const templates = await adminService.getAssessmentTemplateList(1, 1000);

      const graded = submissions.filter((s) => s.lastGrade > 0).length;
      const pending = submissions.filter((s) => s.lastGrade === 0 && s.submittedAt).length;
      const notSubmitted = 0; // Would need total expected submissions to calculate

      const completionRate = submissions.length > 0
        ? (graded / submissions.length) * 100
        : 0;

      // Calculate detailed stats - group by type using template name
      const submissionsByType = { assignment: 0, lab: 0, practicalExam: 0 };

      // Create a map of templateId -> template for quick lookup
      const templateMap = new Map<number, any>();
      templates.items.forEach((template) => {
        templateMap.set(template.id, template);
      });

      submissions.forEach((submission) => {
        const assessment = assessments.items.find((a) => a.id === submission.classAssessmentId);
        if (assessment && assessment.assessmentTemplateId) {
          const template = templateMap.get(assessment.assessmentTemplateId);
          if (template) {
            if (this.isPracticalExamTemplate(template)) {
              submissionsByType.practicalExam++;
            } else if (this.isLabTemplate(template)) {
              submissionsByType.lab++;
            } else {
              submissionsByType.assignment++;
            }
          } else {
            // If template not found, default to assignment
            submissionsByType.assignment++;
          }
        } else {
          // If no assessment found, default to assignment
          submissionsByType.assignment++;
        }
      });
      const gradedSubmissions = submissions.filter((s) => s.lastGrade > 0);
      const averageGrade = gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => sum + s.lastGrade, 0) / gradedSubmissions.length
        : 0;

      const submissionsByGradeRange = {
        excellent: gradedSubmissions.filter((s) => s.lastGrade >= 8.5).length,
        good: gradedSubmissions.filter((s) => s.lastGrade >= 7.0 && s.lastGrade < 8.5).length,
        average: gradedSubmissions.filter((s) => s.lastGrade >= 5.5 && s.lastGrade < 7.0).length,
        belowAverage: gradedSubmissions.filter((s) => s.lastGrade < 5.5).length,
      };

      // Count late vs on-time (would need deadline info)
      const lateSubmissions = 0;
      const onTimeSubmissions = submissions.length;

      // Top students by submissions
      const studentMap = new Map<number, { studentId: number; studentName: string; studentCode: string; submissionCount: number; totalGrade: number; gradedCount: number }>();
      submissions.forEach((sub) => {
        if (!studentMap.has(sub.studentId)) {
          studentMap.set(sub.studentId, {
            studentId: sub.studentId,
            studentName: sub.studentName,
            studentCode: sub.studentCode,
            submissionCount: 0,
            totalGrade: 0,
            gradedCount: 0,
          });
        }
        const student = studentMap.get(sub.studentId)!;
        student.submissionCount++;
        if (sub.lastGrade > 0) {
          student.totalGrade += sub.lastGrade;
          student.gradedCount++;
        }
      });
      const topStudentsBySubmissions = Array.from(studentMap.values())
        .map((s) => ({
          studentId: s.studentId,
          studentName: s.studentName,
          studentCode: s.studentCode,
          submissionCount: s.submissionCount,
          averageGrade: s.gradedCount > 0 ? Math.round((s.totalGrade / s.gradedCount) * 100) / 100 : 0,
        }))
        .sort((a, b) => b.submissionCount - a.submissionCount)
        .slice(0, 10);

      // Submissions by day
      const submissionsByDayMap = new Map<string, number>();
      submissions.forEach((sub) => {
        if (sub.submittedAt) {
          const date = new Date(sub.submittedAt).toISOString().split('T')[0];
          submissionsByDayMap.set(date, (submissionsByDayMap.get(date) || 0) + 1);
        }
      });
      const submissionsByDay = Array.from(submissionsByDayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days

      return {
        total: submissions.length,
        graded,
        pending,
        notSubmitted,
        completionRate: Math.round(completionRate * 100) / 100,
        submissionsByType,
        averageGrade: Math.round(averageGrade * 100) / 100,
        submissionsByGradeRange,
        lateSubmissions,
        onTimeSubmissions,
        topStudentsBySubmissions,
        submissionsByDay,
      };
    } catch (error) {
      console.error('Error fetching submission stats:', error);
      return this.getDefaultSubmissionStats();
    }
  }

  /**
   * Get grading group statistics
   */
  private async getGradingGroupStats(): Promise<{ total: number }> {
    try {
      const groups = await gradingGroupService.getGradingGroups({});
      return { total: groups.length };
    } catch (error) {
      console.error('Error fetching grading group stats:', error);
      return { total: 0 };
    }
  }

  /**
   * Get grading session statistics
   */
  private async getGradingSessionStats(): Promise<{ total: number; completed: number }> {
    try {
      const sessions = await gradingService.getGradingSessions({
        pageNumber: 1,
        pageSize: 1000,
      });

      const completed = sessions.items.filter((s) => s.status === 1).length;

      return {
        total: sessions.totalCount,
        completed,
      };
    } catch (error) {
      console.error('Error fetching grading session stats:', error);
      return { total: 0, completed: 0 };
    }
  }

  /**
   * Get assign request statistics
   */
  private async getAssignRequestStats(): Promise<{ pending: number }> {
    try {
      const requests = await adminService.getApprovalList(1, 1000);
      const pending = requests.items.filter((r) => r.status === 0).length;
      return { pending };
    } catch (error) {
      console.error('Error fetching assign request stats:', error);
      return { pending: 0 };
    }
  }

  /**
   * Get chart data for visualizations
   */
  async getChartData(): Promise<ChartData> {
    try {
      const [userGrowth, semesterActivity, assessmentDistribution, submissionStatus, gradingPerformance] =
        await Promise.allSettled([
          this.getUserGrowthData(),
          this.getSemesterActivityData(),
          this.getAssessmentDistributionData(),
          this.getSubmissionStatusData(),
          this.getGradingPerformanceData(),
        ]);

      return {
        userGrowth: userGrowth.status === 'fulfilled' ? userGrowth.value : [],
        semesterActivity: semesterActivity.status === 'fulfilled' ? semesterActivity.value : [],
        assessmentDistribution: assessmentDistribution.status === 'fulfilled' ? assessmentDistribution.value : [],
        submissionStatus: submissionStatus.status === 'fulfilled' ? submissionStatus.value : [],
        gradingPerformance: gradingPerformance.status === 'fulfilled' ? gradingPerformance.value : [],
      };
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return {
        userGrowth: [],
        semesterActivity: [],
        assessmentDistribution: [],
        submissionStatus: [],
        gradingPerformance: [],
      };
    }
  }

  private async getUserGrowthData(): Promise<UserGrowthData[]> {
    try {
      const { users } = await adminService.getAccountList(1, 1000);

      // Group by month
      // Note: Since User interface doesn't have createdAt, we'll use current month as placeholder
      // In production, this should be calculated from actual createdAt timestamps
      const monthlyData: Record<string, { total: number; students: number; lecturers: number }> = {};
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Aggregate all users into current month (since we don't have createdAt)
      monthlyData[currentMonthKey] = { total: 0, students: 0, lecturers: 0 };

      users.forEach((user) => {
        monthlyData[currentMonthKey].total++;
        if (user.role === ROLES.STUDENT) monthlyData[currentMonthKey].students++;
        if (user.role === ROLES.LECTURER) monthlyData[currentMonthKey].lecturers++;
      });

      return Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          ...data,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12); // Last 12 months
    } catch (error) {
      console.error('Error fetching user growth data:', error);
      return [];
    }
  }

  private async getSemesterActivityData(): Promise<SemesterActivityData[]> {
    try {
      const assessments = await classAssessmentService.getClassAssessments({
        pageNumber: 1,
        pageSize: 1000,
      });
      const classListResult = await classService.getClassList({
        pageNumber: 1,
        pageSize: 1000,
      });
      const classes = classListResult.classes;
      const submissions = await submissionService.getSubmissionList({});

      // Group by semesterName directly from classes (no need to match with semester list)
      const semesterMap = new Map<string, SemesterActivityData>();

      // Count classes per semester
      classes.forEach((cls) => {
        const semesterKey = cls.semesterName || 'Unknown';
        if (!semesterMap.has(semesterKey)) {
          semesterMap.set(semesterKey, {
            semester: semesterKey,
            courses: 0,
            classes: 0,
            assessments: 0,
            submissions: 0,
          });
        }
        const data = semesterMap.get(semesterKey)!;
        data.classes++;
      });

      // Count assessments per semester - group by courseName or semester from class
      const classIdToSemesterMap = new Map<number, string>();
      classes.forEach((cls) => {
        if (cls.semesterName) {
          classIdToSemesterMap.set(cls.id, cls.semesterName);
        }
      });

      // Group assessments by semester from their associated classes
      // Since we don't have direct semester link, we'll count by unique course names
      const courseToSemesterMap = new Map<string, string>();
      classes.forEach((cls) => {
        if (cls.courseName && cls.semesterName) {
          courseToSemesterMap.set(cls.courseName, cls.semesterName);
        }
      });

      assessments.items.forEach((assessment) => {
        // Try to find semester from course name
        const semesterKey = courseToSemesterMap.get(assessment.courseName || '') || 'Unknown';
        if (!semesterMap.has(semesterKey)) {
          semesterMap.set(semesterKey, {
            semester: semesterKey,
            courses: 0,
            classes: 0,
            assessments: 0,
            submissions: 0,
          });
        }
        const data = semesterMap.get(semesterKey)!;
        data.assessments++;
      });

      // Count submissions per semester - via assessment -> course -> semester
      submissions.forEach((submission) => {
        if (!submission.classAssessmentId) return;

        const assessment = assessments.items.find((a) => a.id === submission.classAssessmentId);
        if (assessment) {
          const semesterKey = courseToSemesterMap.get(assessment.courseName || '') || 'Unknown';
          if (!semesterMap.has(semesterKey)) {
            semesterMap.set(semesterKey, {
              semester: semesterKey,
              courses: 0,
              classes: 0,
              assessments: 0,
              submissions: 0,
            });
          }
          const data = semesterMap.get(semesterKey)!;
          data.submissions++;
        }
      });

      // Count unique courses per semester
      const courseCountMap = new Map<string, Set<string>>();
      classes.forEach((cls) => {
        const semesterKey = cls.semesterName || 'Unknown';
        if (!courseCountMap.has(semesterKey)) {
          courseCountMap.set(semesterKey, new Set());
        }
        if (cls.courseName) {
          courseCountMap.get(semesterKey)!.add(cls.courseName);
        }
      });

      // Update courses count
      semesterMap.forEach((data, semesterKey) => {
        const courses = courseCountMap.get(semesterKey);
        data.courses = courses ? courses.size : 0;
      });

      // Return all semesters with data, sorted by semester code
      const result = Array.from(semesterMap.values())
        .filter((data) => data.classes > 0 || data.assessments > 0 || data.submissions > 0)
        .sort((a, b) => a.semester.localeCompare(b.semester))
        .slice(-12); // Last 12 semesters with activity

      return result.length > 0 ? result : [];
    } catch (error) {
      console.error('Error fetching semester activity data:', error);
      return [];
    }
  }

  private async getAssessmentDistributionData(): Promise<AssessmentDistributionData[]> {
    try {
      const templates = await adminService.getAssessmentTemplateList(1, 1000);

      const distribution = {
        assignment: 0,
        lab: 0,
        practicalExam: 0,
      };

      templates.items.forEach((template) => {
        if (this.isPracticalExamTemplate(template)) {
          distribution.practicalExam++;
        } else if (this.isLabTemplate(template)) {
          distribution.lab++;
        } else {
          distribution.assignment++;
        }
      });

      return [
        { type: 'Assignment', count: distribution.assignment },
        { type: 'Lab', count: distribution.lab },
        { type: 'Practical Exam', count: distribution.practicalExam },
      ];
    } catch (error) {
      console.error('Error fetching assessment distribution data:', error);
      return [];
    }
  }

  private async getSubmissionStatusData(): Promise<SubmissionStatusData[]> {
    try {
      const submissions = await submissionService.getSubmissionList({});

      const graded = submissions.filter((s) => s.lastGrade > 0).length;
      const pending = submissions.filter((s) => s.lastGrade === 0 && s.submittedAt).length;
      const notSubmitted = submissions.filter((s) => !s.submittedAt).length;

      return [
        { status: 'Graded', count: graded },
        { status: 'Pending', count: pending },
        { status: 'Not Submitted', count: notSubmitted },
      ];
    } catch (error) {
      console.error('Error fetching submission status data:', error);
      return [];
    }
  }

  private async getGradingPerformanceData(): Promise<GradingPerformanceData[]> {
    try {
      const sessions = await gradingService.getGradingSessions({
        pageNumber: 1,
        pageSize: 1000,
      });

      // Group by date
      const dailyData: Record<string, { graded: number; pending: number }> = {};

      sessions.items.forEach((session) => {
        const date = new Date(session.createdAt).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { graded: 0, pending: 0 };
        }

        if (session.status === 1) {
          dailyData[date].graded++;
        } else {
          dailyData[date].pending++;
        }
      });

      return Object.entries(dailyData)
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days
    } catch (error) {
      console.error('Error fetching grading performance data:', error);
      return [];
    }
  }

  /**
   * Get recent activities
   */
  async getRecentActivities(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];

      // Get recent users
      const { users } = await adminService.getAccountList(1, 20);
      users.slice(0, 5).forEach((user) => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user',
          title: 'User Registered',
          description: `${user.fullName} (${user.email})`,
          timestamp: new Date().toISOString(), // Using current time as placeholder
          icon: '👤',
        });
      });

      // Get recent classes
      const { classes } = await classService.getClassList({
        pageNumber: 1,
        pageSize: 10,
      });
      classes.slice(0, 3).forEach((cls) => {
        activities.push({
          id: `class-${cls.id}`,
          type: 'class',
          title: 'New Class Created',
          description: `${cls.classCode} - ${cls.courseName}`,
          timestamp: cls.createdAt,
          icon: '📚',
        });
      });

      // Get recent submissions
      const submissions = await submissionService.getSubmissionList({});
      submissions.slice(0, 5).forEach((submission) => {
        activities.push({
          id: `submission-${submission.id}`,
          type: 'submission',
          title: 'New Submission',
          description: `${submission.studentName} submitted`,
          timestamp: submission.submittedAt || submission.createdAt,
          icon: '📝',
        });
      });

      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  /**
   * Get pending tasks
   */
  async getPendingTasks(): Promise<PendingTask[]> {
    try {
      const tasks: PendingTask[] = [];

      // Get pending assign requests
      const requests = await adminService.getApprovalList(1, 100);
      requests.items
        .filter((r) => r.status === 0)
        .slice(0, 5)
        .forEach((request) => {
          tasks.push({
            id: `assign-${request.id}`,
            type: 'assign_request',
            title: 'Assign Request Pending',
            description: `${request.courseElementName} - ${request.assignedLecturerName}`,
            priority: 'high',
            timestamp: request.createdAt,
          });
        });

      // Get ungraded submissions
      const submissions = await submissionService.getSubmissionList({});
      submissions
        .filter((s) => s.lastGrade === 0 && s.submittedAt)
        .slice(0, 5)
        .forEach((submission) => {
          tasks.push({
            id: `submission-${submission.id}`,
            type: 'submission',
            title: 'Submission Needs Grading',
            description: `${submission.studentName} - ${submission.studentCode}`,
            priority: 'medium',
            timestamp: submission.submittedAt || submission.createdAt,
          });
        });

      return tasks
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      return [];
    }
  }

  // Default values for error cases
  /**
   * Get detailed user statistics
   */
  async getDetailedUserStats(): Promise<UserStats> {
    return this.getUserStats();
  }

  /**
   * Get detailed academic statistics (DEPRECATED - use private method)
   */
  private async getDetailedAcademicStatsOld(): Promise<AcademicStats> {
    try {
      const [semesters, classes, assessments] = await Promise.all([
        adminService.getPaginatedSemesters(1, 100),
        classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
        classAssessmentService.getClassAssessments({ pageNumber: 1, pageSize: 1000 }),
      ]);

      const now = new Date();
      const activeSemesters = semesters.filter((s) => {
        const start = new Date(s.startDate);
        const end = new Date(s.endDate);
        return now >= start && now <= end;
      });

      // Group classes by semester
      const classesBySemesterMap = new Map<string, {
        semesterCode: string;
        semesterName: string;
        classCount: number;
        studentCount: number;
        lecturerSet: Set<number>;
      }>();

      classes.classes.forEach((cls) => {
        const key = cls.semesterName || 'Unknown';
        if (!classesBySemesterMap.has(key)) {
          classesBySemesterMap.set(key, {
            semesterCode: cls.semesterName || '',
            semesterName: cls.semesterName || '',
            classCount: 0,
            studentCount: 0,
            lecturerSet: new Set(),
          });
        }
        const data = classesBySemesterMap.get(key)!;
        data.classCount++;
        data.studentCount += parseInt(cls.studentCount || '0', 10);
        if (cls.lecturerId) data.lecturerSet.add(parseInt(cls.lecturerId, 10));
      });

      const classesBySemester = Array.from(classesBySemesterMap.values()).map((d) => ({
        semesterCode: d.semesterCode,
        semesterName: d.semesterName,
        classCount: d.classCount,
        studentCount: d.studentCount,
        lecturerCount: d.lecturerSet.size,
      }));

      // Calculate average students per class
      const totalStudents = classes.classes.reduce((sum, cls) =>
        sum + parseInt(cls.studentCount || '0', 10), 0);
      const averageStudentsPerClass = classes.classes.length > 0
        ? Math.round(totalStudents / classes.classes.length)
        : 0;

      // Find classes without students
      const classesWithoutStudents = classes.classes.filter(
        (cls) => parseInt(cls.studentCount || '0', 10) === 0
      ).length;

      // Count overloaded classes (>50 students)
      const classesOverloaded = classes.classes.filter(
        (cls) => parseInt(cls.studentCount || '0', 10) > 50
      ).length;

      // Count unique courses
      const uniqueCourses = new Set<string>();
      classes.classes.forEach((cls) => {
        if (cls.courseName) uniqueCourses.add(cls.courseName);
      });

      // Count unique lecturers
      const uniqueLecturers = new Set<string>();
      classes.classes.forEach((cls) => {
        if (cls.lecturerId) uniqueLecturers.add(cls.lecturerId);
      });

      // Calculate lecturer workload
      const lecturerWorkloadMap = new Map<string, {
        lecturerId: string;
        lecturerName: string;
        classCount: number;
        studentCount: number;
      }>();

      classes.classes.forEach((cls) => {
        if (cls.lecturerId && cls.lecturerName) {
          if (!lecturerWorkloadMap.has(cls.lecturerId)) {
            lecturerWorkloadMap.set(cls.lecturerId, {
              lecturerId: cls.lecturerId,
              lecturerName: cls.lecturerName,
              classCount: 0,
              studentCount: 0,
            });
          }
          const lecturer = lecturerWorkloadMap.get(cls.lecturerId)!;
          lecturer.classCount++;
          lecturer.studentCount += parseInt(cls.studentCount || '0', 10);
        }
      });

      const lecturerWorkload = Array.from(lecturerWorkloadMap.values())
        .sort((a, b) => b.classCount - a.classCount)
        .slice(0, 20);

      // Calculate student to lecturer ratio
      const studentToLecturerRatio = uniqueLecturers.size > 0
        ? Math.round((totalStudents / uniqueLecturers.size) * 10) / 10
        : 0;

      // Top classes by students
      const topClassesByStudents = classes.classes
        .map((cls) => ({
          id: cls.id,
          classCode: cls.classCode,
          courseName: cls.courseName,
          studentCount: parseInt(cls.studentCount || '0', 10),
          lecturerName: cls.lecturerName,
        }))
        .sort((a, b) => b.studentCount - a.studentCount)
        .slice(0, 10);

      return {
        totalSemesters: semesters.length,
        activeSemesters: activeSemesters.length,
        totalClasses: classes.total,
        totalCourseElements: 0,
        totalCourses: uniqueCourses.size,
        totalStudents,
        totalLecturers: uniqueLecturers.size,
        classesOverloaded,
        classesBySemester,
        averageStudentsPerClass,
        classesWithoutStudents,
        topClassesByStudents,
        semesterCourses: uniqueCourses.size,
        lecturerWorkload,
        studentToLecturerRatio,
      };
    } catch (error) {
      console.error('Error fetching detailed academic stats:', error);
      return {
        totalSemesters: 0,
        activeSemesters: 0,
        totalClasses: 0,
        totalCourseElements: 0,
        totalCourses: 0,
        totalStudents: 0,
        totalLecturers: 0,
        classesOverloaded: 0,
        classesBySemester: [],
        averageStudentsPerClass: 0,
        classesWithoutStudents: 0,
        topClassesByStudents: [],
        semesterCourses: 0,
        lecturerWorkload: [],
        studentToLecturerRatio: 0,
      };
    }
  }

  /**
   * Get detailed assessment statistics (DEPRECATED - use private method)
   */
  private async getDetailedAssessmentStatsOld(): Promise<AssessmentStats> {
    try {
      const [templates, assessments] = await Promise.all([
        adminService.getAssessmentTemplateList(1, 1000),
        classAssessmentService.getClassAssessments({ pageNumber: 1, pageSize: 1000 }),
      ]);

      const byType = {
        assignment: 0,
        lab: 0,
        practicalExam: 0,
      };

      templates.items.forEach((template) => {
        if (this.isPracticalExamTemplate(template)) {
          byType.practicalExam++;
        } else if (this.isLabTemplate(template)) {
          byType.lab++;
        } else {
          byType.assignment++;
        }
      });

      const now = new Date();
      const assessmentsByStatus = {
        active: 0,
        completed: 0,
        pending: 0,
      };

      const lecturerMap = new Map<number, { lecturerId: number; lecturerName: string; count: number }>();
      const submissions = await submissionService.getSubmissionList({});

      assessments.items.forEach((assessment) => {
        const endDate = new Date(assessment.endAt);
        if (now < endDate) assessmentsByStatus.active++;
        else assessmentsByStatus.completed++;

        // Count by lecturer
        const lecturerId = assessment.lecturerName ? 0 : 0; // Would need lecturerId
        if (!lecturerMap.has(lecturerId)) {
          lecturerMap.set(lecturerId, {
            lecturerId,
            lecturerName: assessment.lecturerName || 'Unknown',
            count: 0,
          });
        }
        lecturerMap.get(lecturerId)!.count++;

        // Count submissions for this assessment
        const assessmentSubmissions = submissions.filter(
          (s) => s.classAssessmentId === assessment.id
        );
      });

      const assessmentsByLecturer = Array.from(lecturerMap.values());

      // Calculate average submissions per assessment
      const totalSubmissions = submissions.length;
      const averageSubmissionsPerAssessment = assessments.items.length > 0
        ? Math.round(totalSubmissions / assessments.items.length)
        : 0;

      // Find assessments without submissions
      const assessmentsWithoutSubmissions = assessments.items.filter((assessment) => {
        const assessmentSubmissions = submissions.filter(
          (s) => s.classAssessmentId === assessment.id
        );
        return assessmentSubmissions.length === 0;
      }).length;

      // Top assessments by submissions
      const topAssessmentsBySubmissions = assessments.items
        .map((assessment) => {
          const assessmentSubmissions = submissions.filter(
            (s) => s.classAssessmentId === assessment.id
          );
          return {
            id: assessment.id,
            name: assessment.assessmentTemplateName,
            courseName: assessment.courseName,
            submissionCount: assessmentSubmissions.length,
            lecturerName: assessment.lecturerName,
          };
        })
        .sort((a, b) => b.submissionCount - a.submissionCount)
        .slice(0, 10);

      // Upcoming deadlines
      const upcomingDeadlines = assessments.items
        .filter((assessment) => {
          const endDate = new Date(assessment.endAt);
          return endDate > now;
        })
        .map((assessment) => {
          const endDate = new Date(assessment.endAt);
          const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: assessment.id,
            name: assessment.assessmentTemplateName,
            endAt: assessment.endAt,
            daysRemaining,
          };
        })
        .sort((a, b) => a.daysRemaining - b.daysRemaining)
        .slice(0, 10);

      return {
        totalTemplates: templates.totalCount,
        totalClassAssessments: assessments.total,
        byType,
        assessmentsByStatus,
        assessmentsByLecturer,
        averageSubmissionsPerAssessment,
        assessmentsWithoutSubmissions,
        topAssessmentsBySubmissions,
        upcomingDeadlines,
      };
    } catch (error) {
      console.error('Error fetching detailed assessment stats:', error);
      return this.getDefaultAssessmentStats();
    }
  }

  /**
   * Get detailed submission statistics
   */
  async getDetailedSubmissionStats(): Promise<SubmissionStats> {
    try {
      const submissions = await submissionService.getSubmissionList({});
      const assessments = await classAssessmentService.getClassAssessments({
        pageNumber: 1,
        pageSize: 1000,
      });
      const templates = await adminService.getAssessmentTemplateList(1, 1000);

      const graded = submissions.filter((s) => s.lastGrade > 0).length;
      const pending = submissions.filter((s) => s.lastGrade === 0 && s.submittedAt).length;
      const notSubmitted = 0;
      const completionRate = submissions.length > 0
        ? (graded / submissions.length) * 100
        : 0;

      // Group by type
      const submissionsByType = {
        assignment: 0,
        lab: 0,
        practicalExam: 0,
      };

      // Create a map of templateId -> template for quick lookup
      const templateMap = new Map<number, any>();
      templates.items.forEach((template: any) => {
        templateMap.set(template.id, template);
      });

      submissions.forEach((submission) => {
        const assessment = assessments.items.find((a) => a.id === submission.classAssessmentId);
        if (assessment && assessment.assessmentTemplateId) {
          const template = templateMap.get(assessment.assessmentTemplateId);
          if (template) {
            if (this.isPracticalExamTemplate(template)) {
              submissionsByType.practicalExam++;
            } else if (this.isLabTemplate(template)) {
              submissionsByType.lab++;
            } else {
              submissionsByType.assignment++;
            }
          } else {
            // If template not found, default to assignment
            submissionsByType.assignment++;
          }
        } else {
          // If no assessment found, default to assignment
          submissionsByType.assignment++;
        }
      });

      // Calculate average grade
      const gradedSubmissions = submissions.filter((s) => s.lastGrade > 0);
      const totalGrade = gradedSubmissions.reduce((sum, s) => sum + s.lastGrade, 0);
      const averageGrade = gradedSubmissions.length > 0
        ? Math.round((totalGrade / gradedSubmissions.length) * 100) / 100
        : 0;

      // Grade ranges
      const submissionsByGradeRange = {
        excellent: gradedSubmissions.filter((s) => s.lastGrade >= 8.5).length,
        good: gradedSubmissions.filter((s) => s.lastGrade >= 7.0 && s.lastGrade < 8.5).length,
        average: gradedSubmissions.filter((s) => s.lastGrade >= 5.5 && s.lastGrade < 7.0).length,
        belowAverage: gradedSubmissions.filter((s) => s.lastGrade < 5.5).length,
      };

      // Late vs on-time submissions
      let lateSubmissions = 0;
      let onTimeSubmissions = 0;

      submissions.forEach((submission) => {
        if (!submission.submittedAt) return;
        const assessment = assessments.items.find((a) => a.id === submission.classAssessmentId);
        if (assessment) {
          const submittedAt = new Date(submission.submittedAt);
          const deadline = new Date(assessment.endAt);
          if (submittedAt > deadline) lateSubmissions++;
          else onTimeSubmissions++;
        }
      });

      // Top students by submissions
      const studentMap = new Map<number, {
        studentId: number;
        studentName: string;
        studentCode: string;
        submissionCount: number;
        totalGrade: number;
        gradeCount: number;
      }>();

      submissions.forEach((submission) => {
        if (!studentMap.has(submission.studentId)) {
          studentMap.set(submission.studentId, {
            studentId: submission.studentId,
            studentName: submission.studentName,
            studentCode: submission.studentCode,
            submissionCount: 0,
            totalGrade: 0,
            gradeCount: 0,
          });
        }
        const student = studentMap.get(submission.studentId)!;
        student.submissionCount++;
        if (submission.lastGrade > 0) {
          student.totalGrade += submission.lastGrade;
          student.gradeCount++;
        }
      });

      const topStudentsBySubmissions = Array.from(studentMap.values())
        .map((student) => ({
          studentId: student.studentId,
          studentName: student.studentName,
          studentCode: student.studentCode,
          submissionCount: student.submissionCount,
          averageGrade: student.gradeCount > 0
            ? Math.round((student.totalGrade / student.gradeCount) * 100) / 100
            : 0,
        }))
        .sort((a, b) => b.submissionCount - a.submissionCount)
        .slice(0, 10);

      // Submissions by day
      const submissionsByDayMap = new Map<string, number>();
      submissions.forEach((submission) => {
        if (submission.submittedAt) {
          const date = new Date(submission.submittedAt).toISOString().split('T')[0];
          submissionsByDayMap.set(date, (submissionsByDayMap.get(date) || 0) + 1);
        }
      });

      const submissionsByDay = Array.from(submissionsByDayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days

      return {
        total: submissions.length,
        graded,
        pending,
        notSubmitted,
        completionRate: Math.round(completionRate * 100) / 100,
        submissionsByType,
        averageGrade,
        submissionsByGradeRange,
        lateSubmissions,
        onTimeSubmissions,
        topStudentsBySubmissions,
        submissionsByDay,
      };
    } catch (error) {
      console.error('Error fetching detailed submission stats:', error);
      return this.getDefaultSubmissionStats();
    }
  }

  /**
   * Get detailed grading statistics
   */
  async getDetailedGradingStats(): Promise<GradingStats> {
    try {
      const [groups, sessions, requests] = await Promise.all([
        gradingGroupService.getGradingGroups({}),
        gradingService.getGradingSessions({ pageNumber: 1, pageSize: 1000 }),
        adminService.getApprovalList(1, 1000),
      ]);

      const completedSessions = sessions.items.filter((s) => s.status === 1).length;
      const pendingRequests = requests.items.filter((r) => r.status === 0).length;

      // Group by status
      const gradingSessionsByStatus = {
        processing: sessions.items.filter((s) => s.status === 0).length,
        completed: completedSessions,
        failed: sessions.items.filter((s) => s.status === 2).length,
      };

      // Group by type
      const gradingSessionsByType = {
        ai: sessions.items.filter((s) => s.gradingType === 0).length,
        lecturer: sessions.items.filter((s) => s.gradingType === 1).length,
        both: sessions.items.filter((s) => s.gradingType === 2).length,
      };

      // Group by lecturer
      const lecturerMap = new Map<number, {
        lecturerId: number;
        lecturerName: string;
        sessionCount: number;
        completedCount: number;
      }>();

      sessions.items.forEach((session) => {
        // Would need lecturerId from session
        const lecturerId = 0;
        if (!lecturerMap.has(lecturerId)) {
          lecturerMap.set(lecturerId, {
            lecturerId,
            lecturerName: 'Unknown',
            sessionCount: 0,
            completedCount: 0,
          });
        }
        const lecturer = lecturerMap.get(lecturerId)!;
        lecturer.sessionCount++;
        if (session.status === 1) lecturer.completedCount++;
      });

      const gradingByLecturer = Array.from(lecturerMap.values());

      // Pending requests by lecturer
      const requestLecturerMap = new Map<number, {
        lecturerId: number;
        lecturerName: string;
        requestCount: number;
      }>();

      requests.items
        .filter((r) => r.status === 0)
        .forEach((request) => {
          const lecturerId = request.assignedLecturerId;
          if (!requestLecturerMap.has(lecturerId)) {
            requestLecturerMap.set(lecturerId, {
              lecturerId,
              lecturerName: request.assignedLecturerName,
              requestCount: 0,
            });
          }
          requestLecturerMap.get(lecturerId)!.requestCount++;
        });

      const pendingAssignRequestsByLecturer = Array.from(requestLecturerMap.values());

      // Grading groups by status
      const gradingGroupsByStatus = {
        active: groups.filter((g) => g.submissionCount > 0).length,
        completed: 0, // Would need status field
      };

      return {
        totalGradingGroups: groups.length,
        totalGradingSessions: sessions.totalCount,
        pendingAssignRequests: pendingRequests,
        completedGradingSessions: completedSessions,
        gradingSessionsByStatus,
        gradingSessionsByType,
        gradingByLecturer,
        pendingAssignRequestsByLecturer,
        gradingGroupsByStatus,
      };
    } catch (error) {
      console.error('Error fetching detailed grading stats:', error);
      return {
        totalGradingGroups: 0,
        totalGradingSessions: 0,
        pendingAssignRequests: 0,
        completedGradingSessions: 0,
        gradingSessionsByStatus: { processing: 0, completed: 0, failed: 0 },
        gradingSessionsByType: { ai: 0, lecturer: 0, both: 0 },
        gradingByLecturer: [],
        pendingAssignRequestsByLecturer: [],
        gradingGroupsByStatus: { active: 0, completed: 0 },
      };
    }
  }

  private getDefaultUserStats(): UserStats {
    return {
      total: 0,
      byRole: {
        admin: 0,
        lecturer: 0,
        student: 0,
        hod: 0,
      },
      newThisMonth: 0,
      active: 0,
      inactive: 0,
      neverLoggedIn: 0,
      byGender: { male: 0, female: 0, other: 0 },
      usersWithAvatar: 0,
      usersWithoutAvatar: 0,
      usersWithPhone: 0,
      usersWithoutPhone: 0,
    };
  }

  private getDefaultAssessmentStats(): AssessmentStats {
    return {
      totalTemplates: 0,
      totalClassAssessments: 0,
      byType: {
        assignment: 0,
        lab: 0,
        practicalExam: 0,
      },
      assessmentsByStatus: { active: 0, completed: 0, pending: 0 },
      assessmentsByLecturer: [],
      averageSubmissionsPerAssessment: 0,
      assessmentsWithoutSubmissions: 0,
      topAssessmentsBySubmissions: [],
      upcomingDeadlines: [],
    };
  }

  private getDefaultSubmissionStats(): SubmissionStats {
    return {
      total: 0,
      graded: 0,
      pending: 0,
      notSubmitted: 0,
      completionRate: 0,
      submissionsByType: { assignment: 0, lab: 0, practicalExam: 0 },
      averageGrade: 0,
      submissionsByGradeRange: { excellent: 0, good: 0, average: 0, belowAverage: 0 },
      lateSubmissions: 0,
      onTimeSubmissions: 0,
      topStudentsBySubmissions: [],
      submissionsByDay: [],
    };
  }

  /**
   * Get detailed academic statistics
   */
  private async getDetailedAcademicStats(): Promise<Partial<AcademicStats>> {
    try {
      const { classes } = await classService.getClassList({
        pageNumber: 1,
        pageSize: 1000,
      });
      const semesters = await adminService.getPaginatedSemesters(1, 100);

      // Get course elements
      const courseElements = await courseElementService.getCourseElements({
        pageNumber: 1,
        pageSize: 1000,
      });

      // Calculate average students per class
      const totalStudents = classes.reduce(
        (sum, cls) => sum + (parseInt(cls.studentCount) || 0),
        0
      );
      const averageStudentsPerClass =
        classes.length > 0 ? totalStudents / classes.length : 0;

      // Count classes without students
      const classesWithoutStudents = classes.filter(
        (cls) => !parseInt(cls.studentCount) || parseInt(cls.studentCount) === 0
      ).length;

      // Count overloaded classes (>50 students)
      const classesOverloaded = classes.filter(
        (cls) => parseInt(cls.studentCount) > 50
      ).length;

      // Top classes by student count
      const topClassesByStudents = classes
        .map((cls) => ({
          id: cls.id,
          classCode: cls.classCode,
          courseName: cls.courseName,
          studentCount: parseInt(cls.studentCount) || 0,
          lecturerName: cls.lecturerName,
        }))
        .sort((a, b) => b.studentCount - a.studentCount)
        .slice(0, 10);

      // Classes by semester - group directly from classes by semesterName
      const semesterMap = new Map<string, {
        semesterCode: string;
        semesterName: string;
        classCount: number;
        studentCount: number;
        lecturerSet: Set<string>;
      }>();

      // Count unique courses
      const uniqueCourses = new Set<string>();
      classes.forEach((cls) => {
        if (cls.courseName) uniqueCourses.add(cls.courseName);
      });

      // Count unique lecturers
      const uniqueLecturers = new Set<string>();
      classes.forEach((cls) => {
        if (cls.lecturerId) uniqueLecturers.add(cls.lecturerId);
      });

      classes.forEach((cls) => {
        const semesterKey = cls.semesterName || 'Unknown';
        if (!semesterMap.has(semesterKey)) {
          semesterMap.set(semesterKey, {
            semesterCode: semesterKey,
            semesterName: semesterKey,
            classCount: 0,
            studentCount: 0,
            lecturerSet: new Set(),
          });
        }
        const data = semesterMap.get(semesterKey)!;
        data.classCount++;
        data.studentCount += parseInt(cls.studentCount || '0', 10);
        if (cls.lecturerId) {
          data.lecturerSet.add(cls.lecturerId);
        }
      });

      const classesBySemester = Array.from(semesterMap.values())
        .filter((item) => item.classCount > 0)
        .sort((a, b) => a.semesterCode.localeCompare(b.semesterCode))
        .map((item) => ({
          semesterCode: item.semesterCode,
          semesterName: item.semesterName,
          classCount: item.classCount,
          studentCount: item.studentCount,
          lecturerCount: item.lecturerSet.size,
        }));

      // Calculate lecturer workload
      const lecturerWorkloadMap = new Map<string, {
        lecturerId: string;
        lecturerName: string;
        classCount: number;
        studentCount: number;
      }>();

      classes.forEach((cls) => {
        if (cls.lecturerId && cls.lecturerName) {
          if (!lecturerWorkloadMap.has(cls.lecturerId)) {
            lecturerWorkloadMap.set(cls.lecturerId, {
              lecturerId: cls.lecturerId,
              lecturerName: cls.lecturerName,
              classCount: 0,
              studentCount: 0,
            });
          }
          const lecturer = lecturerWorkloadMap.get(cls.lecturerId)!;
          lecturer.classCount++;
          lecturer.studentCount += parseInt(cls.studentCount || '0', 10);
        }
      });

      const lecturerWorkload = Array.from(lecturerWorkloadMap.values())
        .sort((a, b) => b.classCount - a.classCount)
        .slice(0, 20);

      // Calculate student to lecturer ratio
      const studentToLecturerRatio = uniqueLecturers.size > 0
        ? Math.round((totalStudents / uniqueLecturers.size) * 10) / 10
        : 0;

      return {
        totalCourseElements: courseElements.length,
        totalCourses: uniqueCourses.size,
        totalStudents,
        totalLecturers: uniqueLecturers.size,
        classesOverloaded,
        averageStudentsPerClass: Math.round(averageStudentsPerClass * 10) / 10,
        classesWithoutStudents,
        topClassesByStudents,
        classesBySemester,
        semesterCourses: uniqueCourses.size,
        lecturerWorkload,
        studentToLecturerRatio,
      };
    } catch (error) {
      console.error("Error fetching detailed academic stats:", error);
      return {
        totalCourseElements: 0,
        totalCourses: 0,
        totalStudents: 0,
        totalLecturers: 0,
        classesOverloaded: 0,
        averageStudentsPerClass: 0,
        classesWithoutStudents: 0,
        topClassesByStudents: [],
        classesBySemester: [],
        semesterCourses: 0,
        lecturerWorkload: [],
        studentToLecturerRatio: 0,
      };
    }
  }

  /**
   * Get detailed assessment statistics
   */
  private async getDetailedAssessmentStats(): Promise<Partial<AssessmentStats>> {
    try {
      const assessments = await classAssessmentService.getClassAssessments({
        pageNumber: 1,
        pageSize: 1000,
      });
      const submissions = await submissionService.getSubmissionList({});

      // Assessments by status
      const assessmentsByStatus = {
        active: 0,
        completed: 0,
        pending: 0,
      };

      assessments.items.forEach((assessment) => {
        if (assessment.status === 1) assessmentsByStatus.active++;
        else if (assessment.status === 2) assessmentsByStatus.completed++;
        else assessmentsByStatus.pending++;
      });

      // Assessments by lecturer
      const lecturerMap = new Map<number, { lecturerId: number; lecturerName: string; count: number }>();
      assessments.items.forEach((assessment) => {
        // Would need lecturerId from assessment
        // For now, using lecturerName as key
      });

      // Average submissions per assessment
      const totalSubmissions = submissions.length;
      const averageSubmissionsPerAssessment =
        assessments.items.length > 0
          ? totalSubmissions / assessments.items.length
          : 0;

      // Assessments without submissions
      const assessmentsWithoutSubmissions = assessments.items.filter(
        (assessment) => parseInt(assessment.submissionCount) === 0
      ).length;

      // Top assessments by submissions
      const topAssessmentsBySubmissions = assessments.items
        .map((assessment) => ({
          id: assessment.id,
          name: assessment.assessmentTemplateName,
          courseName: assessment.courseName,
          submissionCount: parseInt(assessment.submissionCount) || 0,
          lecturerName: assessment.lecturerName,
        }))
        .sort((a, b) => b.submissionCount - a.submissionCount)
        .slice(0, 10);

      // Upcoming deadlines (next 7 days)
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingDeadlines = assessments.items
        .filter((assessment) => {
          const endDate = new Date(assessment.endAt);
          return endDate >= now && endDate <= nextWeek;
        })
        .map((assessment) => ({
          id: assessment.id,
          name: assessment.assessmentTemplateName,
          endAt: assessment.endAt,
          daysRemaining: Math.ceil(
            (new Date(assessment.endAt).getTime() - now.getTime()) /
            (24 * 60 * 60 * 1000)
          ),
        }))
        .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
        .slice(0, 10);

      return {
        assessmentsByStatus,
        assessmentsByLecturer: Array.from(lecturerMap.values()),
        averageSubmissionsPerAssessment: Math.round(averageSubmissionsPerAssessment * 10) / 10,
        assessmentsWithoutSubmissions,
        topAssessmentsBySubmissions,
        upcomingDeadlines,
      };
    } catch (error) {
      console.error("Error fetching detailed assessment stats:", error);
      return {
        assessmentsByStatus: { active: 0, completed: 0, pending: 0 },
        assessmentsByLecturer: [],
        averageSubmissionsPerAssessment: 0,
        assessmentsWithoutSubmissions: 0,
        topAssessmentsBySubmissions: [],
        upcomingDeadlines: [],
      };
    }
  }
}

export const adminDashboardService = new AdminDashboardService();

