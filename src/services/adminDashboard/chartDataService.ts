import { classAssessmentService } from '../classAssessmentService';
import { classService } from '../classService';
import { submissionService } from '../submissionService';
import { adminService } from '../adminService';
import { gradingService } from '../gradingService';
import { userStatsService } from './userStatsService';
import { isPracticalExamTemplate, isLabTemplate } from './utils';
import type {
  SemesterActivityData,
  AssessmentDistributionData,
  SubmissionStatusData,
  GradingPerformanceData,
} from './types';

export class ChartDataService {
  async getSemesterActivityData(): Promise<SemesterActivityData[]> {
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


      const semesterMap = new Map<string, SemesterActivityData>();


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


      const courseToSemesterMap = new Map<string, string>();
      classes.forEach((cls) => {
        if (cls.courseName && cls.semesterName) {
          courseToSemesterMap.set(cls.courseName, cls.semesterName);
        }
      });

      assessments.items.forEach((assessment) => {

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


      semesterMap.forEach((data, semesterKey) => {
        const courses = courseCountMap.get(semesterKey);
        data.courses = courses ? courses.size : 0;
      });


      const result = Array.from(semesterMap.values())
        .filter((data) => data.classes > 0 || data.assessments > 0 || data.submissions > 0)
        .sort((a, b) => a.semester.localeCompare(b.semester))
        .slice(-12);

      return result.length > 0 ? result : [];
    } catch (error) {
      console.error('Error fetching semester activity data:', error);
      return [];
    }
  }

  async getAssessmentDistributionData(): Promise<AssessmentDistributionData[]> {
    try {
      const templates = await adminService.getAssessmentTemplateList(1, 1000);

      const distribution = {
        assignment: 0,
        lab: 0,
        practicalExam: 0,
      };

      templates.items.forEach((template) => {
        if (isPracticalExamTemplate(template)) {
          distribution.practicalExam++;
        } else if (isLabTemplate(template)) {
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

  async getSubmissionStatusData(): Promise<SubmissionStatusData[]> {
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

  async getGradingPerformanceData(): Promise<GradingPerformanceData[]> {
    try {
      const sessions = await gradingService.getGradingSessions({
        pageNumber: 1,
        pageSize: 1000,
      });


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
        .slice(-30);
    } catch (error) {
      console.error('Error fetching grading performance data:', error);
      return [];
    }
  }
}

export const chartDataService = new ChartDataService();

