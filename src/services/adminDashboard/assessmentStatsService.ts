import { adminService } from '../adminService';
import { classAssessmentService } from '../classAssessmentService';
import { gradingGroupService } from '../gradingGroupService';
import { assessmentTemplateService } from '../assessmentTemplateService';
import { courseElementService } from '../courseElementService';
import { isPracticalExamTemplate, isLabTemplate } from './utils';
import { getDefaultAssessmentStats } from './defaultStats';
import type { AssessmentStats } from './types';
export class AssessmentStatsService {
  async getAssessmentStats(): Promise<AssessmentStats> {
    try {
      const [templates, assessments, gradingGroups, allTemplates, courseElements] = await Promise.all([
        adminService.getAssessmentTemplateList(1, 1000),
        classAssessmentService.getClassAssessments({ pageNumber: 1, pageSize: 1000 }),
        gradingGroupService.getGradingGroups({}),
        assessmentTemplateService.getAssessmentTemplates({ pageNumber: 1, pageSize: 1000 }),
        courseElementService.getCourseElements({ pageNumber: 1, pageSize: 1000 }),
      ]);
      
      // Count Practical Exam from grading groups that have submitted grade report
      const templateMap = new Map(allTemplates.items.map(t => [t.id, t]));
      const courseElementMap = new Map(courseElements.map(ce => [ce.id, ce]));
      const practicalExamGradingGroups = gradingGroups.filter((group) => {
        if (!group.assessmentTemplateId) return false;
        const template = templateMap.get(group.assessmentTemplateId);
        if (!template) return false;
        // Check if it's Practical Exam
        if (template.courseElementId) {
          const courseElement = courseElementMap.get(template.courseElementId);
          if (courseElement?.elementType === 2) {
            return !!(group.submittedGradeSheetUrl || group.gradeSheetSubmittedAt);
          }
        }
        return isPracticalExamTemplate(template) && !!(group.submittedGradeSheetUrl || group.gradeSheetSubmittedAt);
      });
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
        totalClassAssessments: assessments.total + practicalExamGradingGroups.length,
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
      const [templates, assessments, gradingGroups, allTemplates, courseElements] = await Promise.all([
        adminService.getAssessmentTemplateList(1, 1000),
        classAssessmentService.getClassAssessments({ pageNumber: 1, pageSize: 1000 }),
        gradingGroupService.getGradingGroups({}),
        assessmentTemplateService.getAssessmentTemplates({ pageNumber: 1, pageSize: 1000 }),
        courseElementService.getCourseElements({ pageNumber: 1, pageSize: 1000 }),
      ]);
      
      // Count Practical Exam from grading groups that have submitted grade report
      const templateMap = new Map(allTemplates.items.map(t => [t.id, t]));
      const courseElementMap = new Map(courseElements.map(ce => [ce.id, ce]));
      const practicalExamGradingGroups = gradingGroups.filter((group) => {
        if (!group.assessmentTemplateId) return false;
        const template = templateMap.get(group.assessmentTemplateId);
        if (!template) return false;
        // Check if it's Practical Exam
        if (template.courseElementId) {
          const courseElement = courseElementMap.get(template.courseElementId);
          if (courseElement?.elementType === 2) {
            return !!(group.submittedGradeSheetUrl || group.gradeSheetSubmittedAt);
          }
        }
        return isPracticalExamTemplate(template) && !!(group.submittedGradeSheetUrl || group.gradeSheetSubmittedAt);
      });
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
        totalClassAssessments: assessments.total + practicalExamGradingGroups.length,
        byType,
      };
    } catch (error) {
      console.error('Error fetching detailed assessment stats:', error);
      return {};
    }
  }
}
export const assessmentStatsService = new AssessmentStatsService();