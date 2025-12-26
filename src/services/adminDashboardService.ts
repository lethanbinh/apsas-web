import { academicStatsService } from './adminDashboard/academicStatsService';
import { assessmentStatsService } from './adminDashboard/assessmentStatsService';
import { chartDataService } from './adminDashboard/chartDataService';
import { getDefaultAssessmentStats, getDefaultSubmissionStats, getDefaultUserStats } from './adminDashboard/defaultStats';
import { gradeStatsService } from './adminDashboard/gradeStatsService';
import { gradingStatsService } from './adminDashboard/gradingStatsService';
import { submissionStatsService } from './adminDashboard/submissionStatsService';
import type {
  AcademicStats,
  AssessmentStats,
  ChartData,
  DashboardOverview,
  GradeStats,
  GradingStats,
  PendingTask,
  RecentActivity,
  SubmissionStats,
  UserStats
} from './adminDashboard/types';
import { userStatsService } from './adminDashboard/userStatsService';
import { isLabTemplate, isPracticalExamTemplate } from './adminDashboard/utils';
import { adminService } from './adminService';
import { classAssessmentService } from './classAssessmentService';
import { classService } from './classService';
import { gradingGroupService } from './gradingGroupService';
import { gradingService } from './gradingService';
import { submissionService } from './submissionService';
export type {
  AcademicStats, AssessmentDistributionData, AssessmentStats, ChartData, DashboardOverview, GradeStats, GradingPerformanceData, GradingStats, PendingTask, RecentActivity, SemesterActivityData, SubmissionsOverTimeData, SubmissionStats, SubmissionStatusData, UserGrowthData, UserStats
} from './adminDashboard/types';
export class AdminDashboardService {
  async getDashboardOverview(): Promise<DashboardOverview> {
    try {
      const [
        usersData,
        semestersData,
        classesData,
        assessmentsData,
        submissionsData,
        gradingGroupsData,
        gradingSessionsData,
        assignRequestsData,
        gradesData,
      ] = await Promise.allSettled([
        userStatsService.getUserStats(),
        academicStatsService.getSemesterStats(),
        academicStatsService.getClassStats(),
        assessmentStatsService.getAssessmentStats(),
        submissionStatsService.getSubmissionStats(),
        gradingStatsService.getGradingGroupStats(),
        gradingStatsService.getGradingSessionStats(),
        gradingStatsService.getAssignRequestStats(),
        gradeStatsService.getGradeStats(),
      ]);
      const users = usersData.status === 'fulfilled' ? usersData.value : getDefaultUserStats();
      const academicDetailed = await academicStatsService.getDetailedAcademicStats();
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
      const assessmentDetailed = await assessmentStatsService.getDetailedAssessmentStats();
      const baseAssessments = assessmentsData.status === 'fulfilled' ? assessmentsData.value : getDefaultAssessmentStats();
      const assessments: AssessmentStats = {
        ...baseAssessments,
        assessmentsByStatus: assessmentDetailed.assessmentsByStatus || { active: 0, completed: 0, pending: 0 },
        assessmentsByLecturer: assessmentDetailed.assessmentsByLecturer || [],
        averageSubmissionsPerAssessment: assessmentDetailed.averageSubmissionsPerAssessment || 0,
        assessmentsWithoutSubmissions: assessmentDetailed.assessmentsWithoutSubmissions || 0,
        topAssessmentsBySubmissions: assessmentDetailed.topAssessmentsBySubmissions || [],
        upcomingDeadlines: assessmentDetailed.upcomingDeadlines || [],
      };
      const submissions = submissionsData.status === 'fulfilled' ? submissionsData.value : getDefaultSubmissionStats();
      const gradingDetailed = await gradingStatsService.getDetailedGradingStats();
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
      const grades: GradeStats = gradesData.status === 'fulfilled' ? gradesData.value : {
        totalGraded: 0,
        averageGrade: 0,
        medianGrade: 0,
        gradeDistribution: { excellent: 0, good: 0, average: 0, belowAverage: 0 },
        averageGradeByType: { assignment: 0, lab: 0, practicalExam: 0 },
        averageGradeByClass: [],
        gradeDistributionChart: [],
        gradingCompletionRate: 0,
        topClassesByAverage: [],
        bottomClassesByAverage: [],
      };
      return {
        users,
        academic,
        assessments,
        submissions,
        grading,
        grades,
      };
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      throw error;
    }
  }
  async getChartData(): Promise<ChartData> {
    try {
      const [userGrowth, semesterActivity, assessmentDistribution, submissionStatus, gradingPerformance, submissionsOverTime] =
        await Promise.allSettled([
          userStatsService.getUserGrowthData(),
          chartDataService.getSemesterActivityData(),
          chartDataService.getAssessmentDistributionData(),
          chartDataService.getSubmissionStatusData(),
          chartDataService.getGradingPerformanceData(),
          chartDataService.getSubmissionsOverTimeData(),
        ]);
      return {
        userGrowth: userGrowth.status === 'fulfilled' ? userGrowth.value : [],
        semesterActivity: semesterActivity.status === 'fulfilled' ? semesterActivity.value : [],
        assessmentDistribution: assessmentDistribution.status === 'fulfilled' ? assessmentDistribution.value : [],
        submissionStatus: submissionStatus.status === 'fulfilled' ? submissionStatus.value : [],
        gradingPerformance: gradingPerformance.status === 'fulfilled' ? gradingPerformance.value : [],
        submissionsOverTime: submissionsOverTime.status === 'fulfilled' ? submissionsOverTime.value : [],
      };
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return {
        userGrowth: [],
        semesterActivity: [],
        assessmentDistribution: [],
        submissionStatus: [],
        gradingPerformance: [],
        submissionsOverTime: [],
      };
    }
  }
  async getRecentActivities(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];
      const { users } = await adminService.getAccountList(1, 20);
      users.slice(0, 5).forEach((user) => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user',
          title: 'User Registered',
          description: `${user.fullName} (${user.email})`,
          timestamp: new Date().toISOString(),
          icon: '👤',
        });
      });
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
  async getPendingTasks(): Promise<PendingTask[]> {
    try {
      const tasks: PendingTask[] = [];
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
  async getDetailedUserStats(): Promise<UserStats> {
    return userStatsService.getUserStats();
  }
  async getDetailedSubmissionStats(): Promise<SubmissionStats> {
    return submissionStatsService.getDetailedSubmissionStats();
  }
  async getDetailedGradingStats(): Promise<GradingStats> {
    try {
      const [groups, sessions, requests] = await Promise.all([
        gradingGroupService.getGradingGroups({}),
        gradingService.getGradingSessions({ pageNumber: 1, pageSize: 1000 }),
        adminService.getApprovalList(1, 1000),
      ]);
      const completedSessions = sessions.items.filter((s) => s.status === 1).length;
      const pendingRequests = requests.items.filter((r) => r.status === 0).length;
      const gradingSessionsByStatus = {
        processing: sessions.items.filter((s) => s.status === 0).length,
        completed: completedSessions,
        failed: sessions.items.filter((s) => s.status === 2).length,
      };
      const gradingSessionsByType = {
        ai: sessions.items.filter((s) => s.gradingType === 0).length,
        lecturer: sessions.items.filter((s) => s.gradingType === 1).length,
        both: sessions.items.filter((s) => s.gradingType === 2).length,
      };
      const lecturerMap = new Map<number, {
        lecturerId: number;
        lecturerName: string;
        sessionCount: number;
        completedCount: number;
      }>();
      sessions.items.forEach((session) => {
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
      const gradingGroupsByStatus = {
        active: groups.filter((g) => g.submissionCount > 0).length,
        completed: 0,
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
  private async getDetailedAcademicStats(): Promise<Partial<AcademicStats>> {
    return academicStatsService.getDetailedAcademicStats();
  }
  private async getDetailedAssessmentStats(): Promise<Partial<AssessmentStats>> {
    return assessmentStatsService.getDetailedAssessmentStats();
  }
}
export const adminDashboardService = new AdminDashboardService();