import { adminService } from './adminService';
import { classAssessmentService } from './classAssessmentService';
import { classService } from './classService';
import { courseElementService } from './courseElementService';
import { gradingGroupService } from './gradingGroupService';
import { gradingService } from './gradingService';
import { submissionService } from './submissionService';
// Import types for internal use
import type {
  DashboardOverview,
  UserStats,
  AcademicStats,
  AssessmentStats,
  SubmissionStats,
  GradingStats,
  ChartData,
  UserGrowthData,
  SemesterActivityData,
  AssessmentDistributionData,
  SubmissionStatusData,
  GradingPerformanceData,
  RecentActivity,
  PendingTask,
} from './adminDashboard/types';
// Export types from types file
export type {
  DashboardOverview,
  UserStats,
  AcademicStats,
  AssessmentStats,
  SubmissionStats,
  GradingStats,
  ChartData,
  UserGrowthData,
  SemesterActivityData,
  AssessmentDistributionData,
  SubmissionStatusData,
  GradingPerformanceData,
  RecentActivity,
  PendingTask,
} from './adminDashboard/types';
// Import services and utilities
import { userStatsService } from './adminDashboard/userStatsService';
import { academicStatsService } from './adminDashboard/academicStatsService';
import { assessmentStatsService } from './adminDashboard/assessmentStatsService';
import { submissionStatsService } from './adminDashboard/submissionStatsService';
import { gradingStatsService } from './adminDashboard/gradingStatsService';
import { chartDataService } from './adminDashboard/chartDataService';
import { activityService } from './adminDashboard/activityService';
import { isPracticalExamTemplate, isLabTemplate } from './adminDashboard/utils';
import { getDefaultUserStats, getDefaultAssessmentStats, getDefaultSubmissionStats } from './adminDashboard/defaultStats';

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
        userStatsService.getUserStats(),
        academicStatsService.getSemesterStats(),
        academicStatsService.getClassStats(),
        assessmentStatsService.getAssessmentStats(),
        submissionStatsService.getSubmissionStats(),
        gradingStatsService.getGradingGroupStats(),
        gradingStatsService.getGradingSessionStats(),
        gradingStatsService.getAssignRequestStats(),
      ]);

      const users = usersData.status === 'fulfilled' ? usersData.value : getDefaultUserStats();

      // Get detailed academic stats
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

      // Get detailed assessment stats
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

      // Get detailed grading stats
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
   * Get chart data for visualizations
   */
  async getChartData(): Promise<ChartData> {
    try {
      const [userGrowth, semesterActivity, assessmentDistribution, submissionStatus, gradingPerformance] =
        await Promise.allSettled([
          userStatsService.getUserGrowthData(),
          chartDataService.getSemesterActivityData(),
          chartDataService.getAssessmentDistributionData(),
          chartDataService.getSubmissionStatusData(),
          chartDataService.getGradingPerformanceData(),
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
    return userStatsService.getUserStats();
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
        if (isPracticalExamTemplate(template)) {
          byType.practicalExam++;
        } else if (isLabTemplate(template)) {
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
      return getDefaultAssessmentStats();
    }
  }

  /**
   * Get detailed submission statistics
   */
  async getDetailedSubmissionStats(): Promise<SubmissionStats> {
    return submissionStatsService.getDetailedSubmissionStats();
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


  /**
   * Get detailed academic statistics (delegated to academicStatsService)
   */
  private async getDetailedAcademicStats(): Promise<Partial<AcademicStats>> {
    return academicStatsService.getDetailedAcademicStats();
  }

  /**
   * Get detailed assessment statistics (delegated to assessmentStatsService)
   */
  private async getDetailedAssessmentStats(): Promise<Partial<AssessmentStats>> {
    return assessmentStatsService.getDetailedAssessmentStats();
  }
}

export const adminDashboardService = new AdminDashboardService();