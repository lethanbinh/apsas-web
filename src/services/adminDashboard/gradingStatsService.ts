import { gradingGroupService } from '../gradingGroupService';
import { gradingService } from '../gradingService';
import { adminService } from '../adminService';
import type { GradingStats } from './types';

export class GradingStatsService {
  async getGradingGroupStats(): Promise<{ total: number }> {
    try {
      const groups = await gradingGroupService.getGradingGroups({});
      return { total: groups.length };
    } catch (error) {
      console.error('Error fetching grading group stats:', error);
      return { total: 0 };
    }
  }

  async getGradingSessionStats(): Promise<{ total: number; completed: number }> {
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

  async getAssignRequestStats(): Promise<{ pending: number }> {
    try {
      const requests = await adminService.getApprovalList(1, 1000);
      const pending = requests.items.filter((r) => r.status === 0).length;
      return { pending };
    } catch (error) {
      console.error('Error fetching assign request stats:', error);
      return { pending: 0 };
    }
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
}

export const gradingStatsService = new GradingStatsService();

