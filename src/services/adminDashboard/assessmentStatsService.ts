import { adminService } from '../adminService';
import { classAssessmentService } from '../classAssessmentService';
import { isPracticalExamTemplate, isLabTemplate } from './utils';
import { getDefaultAssessmentStats } from './defaultStats';
import type { AssessmentStats } from './types';
export class AssessmentStatsService {
  async getAssessmentStats(): Promise<AssessmentStats> {
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
      return getDefaultAssessmentStats();
    }
  }
  async getDetailedAssessmentStats(): Promise<Partial<AssessmentStats>> {
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
      return {
        totalTemplates: templates.totalCount,
        totalClassAssessments: assessments.total,
        byType,
      };
    } catch (error) {
      console.error('Error fetching detailed assessment stats:', error);
      return {};
    }
  }
}
export const assessmentStatsService = new AssessmentStatsService();