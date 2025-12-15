import { adminService } from '../adminService';
import { classService } from '../classService';
import { submissionService } from '../submissionService';
import type { RecentActivity, PendingTask } from './types';

export class ActivityService {
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
}

export const activityService = new ActivityService();

