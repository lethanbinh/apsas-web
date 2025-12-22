import { gradingService } from '../gradingService';
import { gradeItemService } from '../gradeItemService';
import { submissionService, Submission } from '../submissionService';
import { classAssessmentService } from '../classAssessmentService';
import { classService } from '../classService';
import { adminService } from '../adminService';
import { gradingGroupService } from '../gradingGroupService';
import { courseElementService } from '../courseElementService';
import { isPracticalExamTemplate, isLabTemplate } from './utils';

export interface GradeStats {
  totalGraded: number;
  averageGrade: number;
  medianGrade: number;
  gradeDistribution: {
    excellent: number; // >= 8.5
    good: number; // 7.0 - 8.4
    average: number; // 5.5 - 6.9
    belowAverage: number; // < 5.5
  };
  averageGradeByType: {
    assignment: number;
    lab: number;
    practicalExam: number;
  };
  averageGradeByClass: Array<{
    classId: number;
    classCode: string;
    courseName: string;
    averageGrade: number;
    studentCount: number;
    gradedCount: number;
  }>;
  gradeDistributionChart: Array<{
    range: string;
    count: number;
  }>;
  gradingCompletionRate: number;
  topClassesByAverage: Array<{
    classId: number;
    classCode: string;
    courseName: string;
    averageGrade: number;
  }>;
  bottomClassesByAverage: Array<{
    classId: number;
    classCode: string;
    courseName: string;
    averageGrade: number;
  }>;
}

export class GradeStatsService {
  async getGradeStats(): Promise<GradeStats> {
    try {
      // Fetch all necessary data
      const [submissionsFromAssessments, assessments, classes, templates, gradingGroups] = await Promise.all([
        submissionService.getSubmissionList({}),
        classAssessmentService.getClassAssessments({ pageNumber: 1, pageSize: 1000 }),
        classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
        adminService.getAssessmentTemplateList(1, 1000),
        gradingGroupService.getGradingGroups({}),
      ]);

      // Fetch submissions from grading groups (for practical exam)
      const gradingGroupIds = gradingGroups.map(g => g.id);
      const submissionsFromGroups = await Promise.all(
        gradingGroupIds.map(groupId =>
          submissionService.getSubmissionList({ gradingGroupId: groupId }).catch(() => [])
        )
      );

      // Combine submissions from class assessments and grading groups
      const submissions = [...submissionsFromAssessments, ...submissionsFromGroups.flat()];

      // Fetch course elements to get classId for practical exam from grading groups
      const assessmentTemplateIds = Array.from(
        new Set(
          gradingGroups
            .filter((g) => g.assessmentTemplateId !== null && g.assessmentTemplateId !== undefined)
            .map((g) => Number(g.assessmentTemplateId))
        )
      );

      const courseElementIds = new Set<number>();
      templates.items.forEach((template) => {
        if (assessmentTemplateIds.includes(template.id) && template.courseElementId) {
          courseElementIds.add(template.courseElementId);
        }
      });

      const courseElements = courseElementIds.size > 0
        ? await courseElementService.getCourseElements({
            pageNumber: 1,
            pageSize: 1000,
          }).catch(() => [])
        : [];

      // Create map from courseElementId to classes
      const courseElementToClassesMap = new Map<number, number[]>();
      courseElements.forEach((element) => {
        if (element.semesterCourse?.classes) {
          const classIds = element.semesterCourse.classes.map((c: any) => c.id);
          courseElementToClassesMap.set(element.id, classIds);
        }
      });

      // Create map from templateId to classIds (for practical exam from grading groups)
      const templateToClassIdsMap = new Map<number, number[]>();
      templates.items.forEach((template) => {
        if (template.courseElementId) {
          const classIds = courseElementToClassesMap.get(template.courseElementId) || [];
          templateToClassIdsMap.set(template.id, classIds);
        }
      });

      // Create map from studentId to classIds for practical exam submissions
      // This helps us find which class a student belongs to for practical exam
      const studentToClassIdsMap = new Map<number, number[]>();
      const allPossibleClassIds = Array.from(new Set(Array.from(templateToClassIdsMap.values()).flat()));
      
      // Fetch students for each class to build student -> classId mapping
      if (allPossibleClassIds.length > 0) {
        const studentsInClassesPromises = allPossibleClassIds.map(async (cId) => {
          try {
            const students = await classService.getStudentsInClass(cId);
            return { classId: cId, students };
          } catch (error) {
            return { classId: cId, students: [] };
          }
        });
        
        const studentsInClassesResults = await Promise.all(studentsInClassesPromises);
        studentsInClassesResults.forEach(({ classId, students }) => {
          students.forEach((student: any) => {
            if (student.studentId) {
              if (!studentToClassIdsMap.has(student.studentId)) {
                studentToClassIdsMap.set(student.studentId, []);
              }
              studentToClassIdsMap.get(student.studentId)!.push(classId);
            }
          });
        });
      }

      // Create template map
      const templateMap = new Map<number, any>();
      templates.items.forEach((template) => {
        templateMap.set(template.id, template);
      });

      // Create assessment map
      const assessmentMap = new Map<number, any>();
      assessments.items.forEach((assessment) => {
        assessmentMap.set(assessment.id, assessment);
      });

      // Create class map
      const classMap = new Map<number, any>();
      classes.classes.forEach((cls) => {
        classMap.set(cls.id, cls);
      });

      // Calculate grades from grading sessions and grade items
      const gradedSubmissions: Array<{
        submissionId: number;
        grade: number;
        classId?: number;
        assessmentType?: 'assignment' | 'lab' | 'practicalExam';
      }> = [];

      // Create grading group map
      const gradingGroupMap = new Map<number, any>();
      gradingGroups.forEach((group) => {
        gradingGroupMap.set(group.id, group);
      });

      // Group submissions by student and assessment/gradingGroup to get latest submission for each student
      const studentSubmissionMap = new Map<string, Submission>();
      for (const submission of submissions) {
        if (!submission.studentId) continue;
        
        // Create key based on submission source
        let key: string;
        if (submission.classAssessmentId) {
          key = `${submission.studentId}_classAssessment_${submission.classAssessmentId}`;
        } else if (submission.gradingGroupId) {
          key = `${submission.studentId}_gradingGroup_${submission.gradingGroupId}`;
        } else {
          continue;
        }

        const existing = studentSubmissionMap.get(key);
        if (!existing) {
          studentSubmissionMap.set(key, submission);
        } else {
          // Keep the latest submission
          const existingDate = existing.submittedAt || existing.createdAt;
          const currentDate = submission.submittedAt || submission.createdAt;
          if (currentDate && existingDate && new Date(currentDate) > new Date(existingDate)) {
            studentSubmissionMap.set(key, submission);
          } else if (currentDate && !existingDate) {
            studentSubmissionMap.set(key, submission);
          } else if (!currentDate && existingDate) {
            // Keep existing
          } else if (submission.id > existing.id) {
            studentSubmissionMap.set(key, submission);
          }
        }
      }

      // Process latest submissions and calculate grades from grade items
      for (const submission of studentSubmissionMap.values()) {
        let assessmentType: 'assignment' | 'lab' | 'practicalExam' = 'assignment';
        let assessment: any = null;
        let isPublished = false;
        let classId: number | undefined = undefined;

        // Determine if submission is from class assessment or grading group
        if (submission.classAssessmentId) {
          // Submission from class assessment (assignment or lab)
          assessment = assessmentMap.get(submission.classAssessmentId);
          if (!assessment) continue;

          if (assessment?.assessmentTemplateId) {
            const template = templateMap.get(assessment.assessmentTemplateId);
            if (template) {
              if (isPracticalExamTemplate(template)) {
                assessmentType = 'practicalExam';
              } else if (isLabTemplate(template)) {
                assessmentType = 'lab';
              }
            }
          }

          isPublished = assessment.isPublished || false;
          classId = assessment.classId;

          // For lab: always calculate (auto-graded available after submission)
          // For assignment/practical exam: only calculate if published
          if (assessmentType !== 'lab' && !isPublished) {
            continue;
          }
        } else if (submission.gradingGroupId) {
          // Submission from grading group (practical exam)
          assessmentType = 'practicalExam';
          const gradingGroup = gradingGroupMap.get(submission.gradingGroupId);
          if (!gradingGroup || !gradingGroup.assessmentTemplateId) continue;
          // Practical exam from grading groups are always considered "published" for grading
          isPublished = true;
          
          // Try to get classId from template -> courseElement -> classes
          const templateId = gradingGroup.assessmentTemplateId;
          const possibleClassIds = templateToClassIdsMap.get(templateId) || [];
          
          // Try to find which class the student belongs to
          if (possibleClassIds.length > 0 && submission.studentId) {
            // First, try to find the student's class from the studentToClassIdsMap
            const studentClassIds = studentToClassIdsMap.get(submission.studentId) || [];
            // Find intersection of possibleClassIds and studentClassIds
            const matchingClassIds = possibleClassIds.filter(cId => studentClassIds.includes(cId));
            
            if (matchingClassIds.length > 0) {
              // Use the first matching classId
              classId = matchingClassIds[0];
            } else if (possibleClassIds.length > 0) {
              // If no match found, use the first possible classId as fallback
              classId = possibleClassIds[0];
            }
          }
        } else {
          continue;
        }

        // Get grading sessions for this submission
        if (!submission.id) continue;
        
        try {
          const gradingSessionsResult = await gradingService.getGradingSessions({
            submissionId: submission.id,
            pageNumber: 1,
            pageSize: 100,
          });

          if (gradingSessionsResult.items.length === 0) {
            continue;
          }

          // Get completed sessions (status === 1)
          const completedSessions = gradingSessionsResult.items.filter(
            (s) => s.status === 1
          );

          if (completedSessions.length === 0) {
            continue;
          }

          // For lab: prioritize teacher-graded if published, otherwise use auto-graded
          // For assignment/practical exam: use teacher-graded (since it's published)
          let selectedSession = null;
          
          if (assessmentType === 'lab' && isPublished) {
            // Find teacher-graded session (gradingType === 1 or 2)
            const teacherSession = completedSessions.find(
              (s) => s.gradingType === 1 || s.gradingType === 2
            );
            if (teacherSession) {
              selectedSession = teacherSession;
            } else {
              // Fallback to auto-graded (gradingType === 0)
              const autoSession = completedSessions.find((s) => s.gradingType === 0);
              selectedSession = autoSession || completedSessions.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0];
            }
          } else if (assessmentType === 'lab') {
            // Not published, use auto-graded
            const autoSession = completedSessions.find((s) => s.gradingType === 0);
            selectedSession = autoSession || completedSessions.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
          } else {
            // Assignment/practical exam: use teacher-graded (gradingType === 1 or 2)
            const teacherSession = completedSessions.find(
              (s) => s.gradingType === 1 || s.gradingType === 2
            );
            selectedSession = teacherSession || completedSessions.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
          }

          if (!selectedSession) continue;

          // Get grade items for this session
          const gradeItemsResult = await gradeItemService.getGradeItems({
            gradingSessionId: selectedSession.id,
            pageNumber: 1,
            pageSize: 1000,
          });

          const gradeItems = gradeItemsResult.items;
          let grade = 0;

          if (gradeItems.length > 0) {
            // Calculate grade from grade items
            const totalScore = gradeItems.reduce((sum, item) => sum + item.score, 0);
            const maxScore = gradeItems.reduce(
              (sum, item) => sum + item.rubricItemMaxScore,
              0
            );
            grade = maxScore > 0 ? (totalScore / maxScore) * 10 : totalScore / 10;
            grade = Math.round(grade * 100) / 100;
          } else if (selectedSession.grade !== undefined && selectedSession.grade !== null) {
            // Fallback to session grade if no grade items
            grade = selectedSession.grade;
          }

          // Only include if grade > 0
          if (grade > 0) {
            gradedSubmissions.push({
              submissionId: submission.id,
              grade,
              classId,
              assessmentType,
            });
          }
        } catch (error) {
          console.error(`Error calculating grade for submission ${submission.id}:`, error);
          continue;
        }
      }

      // Calculate statistics
      const totalGraded = gradedSubmissions.length;
      const grades = gradedSubmissions.map((g) => g.grade);
      const averageGrade = totalGraded > 0
        ? Math.round((grades.reduce((sum, g) => sum + g, 0) / totalGraded) * 100) / 100
        : 0;

      // Calculate median
      const sortedGrades = [...grades].sort((a, b) => a - b);
      const medianGrade = sortedGrades.length > 0
        ? sortedGrades.length % 2 === 0
          ? (sortedGrades[sortedGrades.length / 2 - 1] + sortedGrades[sortedGrades.length / 2]) / 2
          : sortedGrades[Math.floor(sortedGrades.length / 2)]
        : 0;

      // Grade distribution
      const gradeDistribution = {
        excellent: grades.filter((g) => g >= 8.5).length,
        good: grades.filter((g) => g >= 7.0 && g < 8.5).length,
        average: grades.filter((g) => g >= 5.5 && g < 7.0).length,
        belowAverage: grades.filter((g) => g < 5.5).length,
      };

      // Average grade by type
      const gradeByType = {
        assignment: [] as number[],
        lab: [] as number[],
        practicalExam: [] as number[],
      };

      gradedSubmissions.forEach((g) => {
        if (g.assessmentType) {
          gradeByType[g.assessmentType].push(g.grade);
        }
      });

      const averageGradeByType = {
        assignment: gradeByType.assignment.length > 0
          ? Math.round((gradeByType.assignment.reduce((sum, g) => sum + g, 0) / gradeByType.assignment.length) * 100) / 100
          : 0,
        lab: gradeByType.lab.length > 0
          ? Math.round((gradeByType.lab.reduce((sum, g) => sum + g, 0) / gradeByType.lab.length) * 100) / 100
          : 0,
        practicalExam: gradeByType.practicalExam.length > 0
          ? Math.round((gradeByType.practicalExam.reduce((sum, g) => sum + g, 0) / gradeByType.practicalExam.length) * 100) / 100
          : 0,
      };

      // Average grade by class
      const classGradeMap = new Map<number, {
        classId: number;
        classCode: string;
        courseName: string;
        grades: number[];
        studentIds: Set<number>;
      }>();

      gradedSubmissions.forEach((g) => {
        if (g.classId && classMap.has(g.classId)) {
          const cls = classMap.get(g.classId);
          if (!classGradeMap.has(g.classId)) {
            classGradeMap.set(g.classId, {
              classId: g.classId,
              classCode: cls.classCode,
              courseName: cls.courseName,
              grades: [],
              studentIds: new Set(),
            });
          }
          const classData = classGradeMap.get(g.classId)!;
          classData.grades.push(g.grade);
          
          // Find student ID from submission
          const submission = submissions.find((s) => s.id === g.submissionId);
          if (submission?.studentId) {
            classData.studentIds.add(submission.studentId);
          }
        }
      });

      const averageGradeByClass = Array.from(classGradeMap.values())
        .map((classData) => ({
          classId: classData.classId,
          classCode: classData.classCode,
          courseName: classData.courseName,
          averageGrade: classData.grades.length > 0
            ? Math.round((classData.grades.reduce((sum, g) => sum + g, 0) / classData.grades.length) * 100) / 100
            : 0,
          studentCount: classData.studentIds.size,
          gradedCount: classData.grades.length,
        }))
        .filter((c) => c.gradedCount > 0);

      // Grade distribution chart (histogram)
      const gradeRanges = [
        { min: 0, max: 2, label: '0-2' },
        { min: 2, max: 4, label: '2-4' },
        { min: 4, max: 5.5, label: '4-5.5' },
        { min: 5.5, max: 7, label: '5.5-7' },
        { min: 7, max: 8.5, label: '7-8.5' },
        { min: 8.5, max: 10, label: '8.5-10' },
      ];

      const gradeDistributionChart = gradeRanges.map((range) => ({
        range: range.label,
        count: grades.filter((g) => g >= range.min && g < range.max).length,
      }));

      // Grading completion rate
      const totalSubmissions = submissions.length;
      const gradingCompletionRate = totalSubmissions > 0
        ? Math.round((totalGraded / totalSubmissions) * 100 * 100) / 100
        : 0;

      // Top and bottom classes by average
      const sortedClassesByAverage = [...averageGradeByClass].sort((a, b) => b.averageGrade - a.averageGrade);
      const topClassesByAverage = sortedClassesByAverage.slice(0, 10);
      const bottomClassesByAverage = sortedClassesByAverage.slice(-10).reverse();

      return {
        totalGraded,
        averageGrade,
        medianGrade: Math.round(medianGrade * 100) / 100,
        gradeDistribution,
        averageGradeByType,
        averageGradeByClass,
        gradeDistributionChart,
        gradingCompletionRate,
        topClassesByAverage,
        bottomClassesByAverage,
      };
    } catch (error) {
      console.error('Error fetching grade stats:', error);
      return {
        totalGraded: 0,
        averageGrade: 0,
        medianGrade: 0,
        gradeDistribution: {
          excellent: 0,
          good: 0,
          average: 0,
          belowAverage: 0,
        },
        averageGradeByType: {
          assignment: 0,
          lab: 0,
          practicalExam: 0,
        },
        averageGradeByClass: [],
        gradeDistributionChart: [],
        gradingCompletionRate: 0,
        topClassesByAverage: [],
        bottomClassesByAverage: [],
      };
    }
  }
}

export const gradeStatsService = new GradeStatsService();

