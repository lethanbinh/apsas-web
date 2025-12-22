import { classAssessmentService } from '../classAssessmentService';
import { classService } from '../classService';
import { submissionService } from '../submissionService';
import { adminService } from '../adminService';
import { gradingService } from '../gradingService';
import { gradingGroupService } from '../gradingGroupService';
import { userStatsService } from './userStatsService';
import { isPracticalExamTemplate, isLabTemplate } from './utils';
import type {
  SemesterActivityData,
  AssessmentDistributionData,
  SubmissionStatusData,
  GradingPerformanceData,
  SubmissionsOverTimeData,
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

  async getSubmissionsOverTimeData(): Promise<SubmissionsOverTimeData[]> {
    try {
      const [submissions, assessments, templates, gradingGroups] = await Promise.all([
        submissionService.getSubmissionList({}),
        classAssessmentService.getClassAssessments({ pageNumber: 1, pageSize: 1000 }),
        adminService.getAssessmentTemplateList(1, 1000),
        gradingGroupService.getGradingGroups({}),
      ]);

      // Fetch submissions from grading groups
      const gradingGroupIds = gradingGroups.map(g => g.id);
      const submissionsFromGroups = await Promise.all(
        gradingGroupIds.map(groupId =>
          submissionService.getSubmissionList({ gradingGroupId: groupId }).catch(() => [])
        )
      );

      // Combine all submissions
      const allSubmissions = [...submissions, ...submissionsFromGroups.flat()];

      // Filter: only count submissions that have been submitted (have submittedAt)
      const submittedOnly = allSubmissions.filter(sub => sub.submittedAt);

      // Create maps for quick lookup
      const assessmentMap = new Map(assessments.items.map(a => [a.id, a]));
      const templateMap = new Map(templates.items.map(t => [t.id, t]));

      // Only keep latest submission for each student-assessment/gradingGroup pair
      const latestSubmissionsMap = new Map<string, typeof submittedOnly[0]>();
      submittedOnly.forEach((sub) => {
        if (!sub.studentId) return;

        // Create key based on submission source
        let key: string;
        if (sub.classAssessmentId) {
          key = `${sub.studentId}_classAssessment_${sub.classAssessmentId}`;
        } else if (sub.gradingGroupId) {
          key = `${sub.studentId}_gradingGroup_${sub.gradingGroupId}`;
        } else {
          return;
        }

        const existing = latestSubmissionsMap.get(key);

        if (!existing) {
          latestSubmissionsMap.set(key, sub);
        } else {
          // Keep the latest submission
          const existingDate = existing.submittedAt || existing.createdAt;
          const currentDate = sub.submittedAt || sub.createdAt;
          if (currentDate && existingDate && new Date(currentDate) > new Date(existingDate)) {
            latestSubmissionsMap.set(key, sub);
          } else if (currentDate && !existingDate) {
            latestSubmissionsMap.set(key, sub);
          } else if (!currentDate && existingDate) {
            // Keep existing
          } else if (sub.id && existing.id && sub.id > existing.id) {
            latestSubmissionsMap.set(key, sub);
          }
        }
      });

      // Get only latest submissions
      const latestSubmissions = Array.from(latestSubmissionsMap.values());

      // Group submissions by date
      const dailyData: Record<string, { count: number; assignment: number; lab: number; practicalExam: number }> = {};

      latestSubmissions.forEach((submission) => {
        if (!submission.submittedAt) return;

        const date = new Date(submission.submittedAt).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { count: 0, assignment: 0, lab: 0, practicalExam: 0 };
        }

        let type: 'assignment' | 'lab' | 'practicalExam' = 'assignment';

        if (submission.classAssessmentId) {
          const assessment = assessmentMap.get(submission.classAssessmentId);
          if (assessment?.assessmentTemplateId) {
            const template = templateMap.get(assessment.assessmentTemplateId);
            if (template) {
              if (isPracticalExamTemplate(template)) {
                type = 'practicalExam';
              } else if (isLabTemplate(template)) {
                type = 'lab';
              }
            }
          }
        } else if (submission.gradingGroupId) {
          type = 'practicalExam';
        }

        dailyData[date].count++;
        dailyData[date][type]++;
      });

      // Convert to array and sort by date
      const result = Object.entries(dailyData)
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days

      return result.length > 0 ? result : [];
    } catch (error) {
      console.error('Error fetching submissions over time data:', error);
      return [];
    }
  }
}

export const chartDataService = new ChartDataService();

