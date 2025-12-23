import { submissionService } from '../submissionService';
import { classAssessmentService } from '../classAssessmentService';
import { adminService } from '../adminService';
import { isPracticalExamTemplate, isLabTemplate } from './utils';
import { getDefaultSubmissionStats } from './defaultStats';
import type { SubmissionStats } from './types';
export class SubmissionStatsService {
  async getSubmissionStats(): Promise<SubmissionStats> {
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
      const submissionsByType = { assignment: 0, lab: 0, practicalExam: 0 };
      const templateMap = new Map<number, any>();
      templates.items.forEach((template) => {
        templateMap.set(template.id, template);
      });
      submissions.forEach((submission) => {
        const assessment = assessments.items.find((a) => a.id === submission.classAssessmentId);
        if (assessment && assessment.assessmentTemplateId) {
          const template = templateMap.get(assessment.assessmentTemplateId);
          if (template) {
            if (isPracticalExamTemplate(template)) {
              submissionsByType.practicalExam++;
            } else if (isLabTemplate(template)) {
              submissionsByType.lab++;
            } else {
              submissionsByType.assignment++;
            }
          } else {
            submissionsByType.assignment++;
          }
        } else {
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
      const lateSubmissions = 0;
      const onTimeSubmissions = submissions.length;
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
        .slice(-30);
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
      return getDefaultSubmissionStats();
    }
  }
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
      const submissionsByType = {
        assignment: 0,
        lab: 0,
        practicalExam: 0,
      };
      const templateMap = new Map<number, any>();
      templates.items.forEach((template: any) => {
        templateMap.set(template.id, template);
      });
      submissions.forEach((submission) => {
        const assessment = assessments.items.find((a) => a.id === submission.classAssessmentId);
        if (assessment && assessment.assessmentTemplateId) {
          const template = templateMap.get(assessment.assessmentTemplateId);
          if (template) {
            if (isPracticalExamTemplate(template)) {
              submissionsByType.practicalExam++;
            } else if (isLabTemplate(template)) {
              submissionsByType.lab++;
            } else {
              submissionsByType.assignment++;
            }
          } else {
            submissionsByType.assignment++;
          }
        } else {
          submissionsByType.assignment++;
        }
      });
      const gradedSubmissions = submissions.filter((s) => s.lastGrade > 0);
      const totalGrade = gradedSubmissions.reduce((sum, s) => sum + s.lastGrade, 0);
      const averageGrade = gradedSubmissions.length > 0
        ? Math.round((totalGrade / gradedSubmissions.length) * 100) / 100
        : 0;
      const submissionsByGradeRange = {
        excellent: gradedSubmissions.filter((s) => s.lastGrade >= 8.5).length,
        good: gradedSubmissions.filter((s) => s.lastGrade >= 7.0 && s.lastGrade < 8.5).length,
        average: gradedSubmissions.filter((s) => s.lastGrade >= 5.5 && s.lastGrade < 7.0).length,
        belowAverage: gradedSubmissions.filter((s) => s.lastGrade < 5.5).length,
      };
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
        .slice(-30);
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
      return getDefaultSubmissionStats();
    }
  }
}
export const submissionStatsService = new SubmissionStatsService();