import { classService } from "./classService";
import { classAssessmentService, ClassAssessment } from "./classAssessmentService";
import { submissionService, Submission } from "./submissionService";
import { gradingService, GradingSession } from "./gradingService";
import { gradeItemService, GradeItem } from "./gradeItemService";
import { semesterService, Semester } from "./semesterService";
import { courseElementService } from "./courseElementService";

// Pass threshold: >= 5.0 (50/100)
const PASS_THRESHOLD = 5.0;

// Grade distribution thresholds (on 10-point scale)
const GRADE_THRESHOLDS = {
  A: 8.5, // Excellent
  B: 7.0, // Good
  C: 5.5, // Average
  D: 4.0, // Below Average
  F: 0,   // Fail
};

export interface AcademicPerformanceStats {
  // Overall stats
  totalStudents: number;
  totalClasses: number;
  totalCourses: number;
  totalAssessments: number;
  totalSubmissions: number;
  gradedSubmissions: number;
  
  // Pass/Fail stats
  passCount: number;
  failCount: number;
  passRate: number; // percentage
  notGradedCount: number;
  
  // Average grades
  overallAverageGrade: number;
  averageGradeByClass: Array<{
    classId: number;
    classCode: string;
    courseName: string;
    averageGrade: number;
    studentCount: number;
    passCount: number;
    failCount: number;
  }>;
  averageGradeByCourse: Array<{
    courseId: number;
    courseName: string;
    averageGrade: number;
    studentCount: number;
    passCount: number;
    failCount: number;
  }>;
  averageGradeBySemester: Array<{
    semesterCode: string;
    semesterName: string;
    averageGrade: number;
    studentCount: number;
    passCount: number;
    failCount: number;
  }>;
  
  // Grade distribution
  gradeDistribution: {
    A: number; // >= 8.5
    B: number; // 7.0 - 8.49
    C: number; // 5.5 - 6.99
    D: number; // 4.0 - 5.49
    F: number; // < 4.0
  };
  
  // Top performers
  topStudents: Array<{
    studentId: number;
    studentName: string;
    studentCode: string;
    averageGrade: number;
    classCode: string;
    courseName: string;
  }>;
  
  topClasses: Array<{
    classId: number;
    classCode: string;
    courseName: string;
    averageGrade: number;
    passRate: number;
    studentCount: number;
  }>;
  
  // Submission stats
  submissionRate: number; // percentage
  gradingCompletionRate: number; // percentage
}

export interface AcademicPerformanceFilters {
  classId?: number;
  courseId?: number;
  semesterCode?: string;
}

export class AcademicPerformanceService {
  /**
   * Calculate final grade for a student in a class assessment
   * Uses the latest grading session's grade items
   */
  private async calculateStudentGrade(
    submission: Submission,
    classAssessment: ClassAssessment
  ): Promise<{ grade: number; maxGrade: number; isGraded: boolean }> {
    try {
      // Get latest grading session for this submission
      const gradingSessionsResult = await gradingService.getGradingSessions({
        submissionId: submission.id,
        pageNumber: 1,
        pageSize: 100,
      });

      if (gradingSessionsResult.items.length === 0) {
        return { grade: 0, maxGrade: 100, isGraded: false };
      }

      // Get the latest completed grading session
      const completedSessions = gradingSessionsResult.items.filter(
        (s) => s.status === 1 // COMPLETED
      );

      if (completedSessions.length === 0) {
        return { grade: 0, maxGrade: 100, isGraded: false };
      }

      // Sort by createdAt desc and get the latest
      const latestSession = completedSessions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      // Get grade items for this session
      const gradeItemsResult = await gradeItemService.getGradeItems({
        gradingSessionId: latestSession.id,
        pageNumber: 1,
        pageSize: 1000,
      });

      const gradeItems = gradeItemsResult.items;

      if (gradeItems.length === 0) {
        // Fallback to session grade if no grade items
        return {
          grade: latestSession.grade,
          maxGrade: 100,
          isGraded: true,
        };
      }

      // Calculate total score from grade items
      const totalScore = gradeItems.reduce((sum, item) => sum + item.score, 0);
      const maxScore = gradeItems.reduce(
        (sum, item) => sum + item.rubricItemMaxScore,
        0
      );

      // Convert to 10-point scale if maxScore is 100
      const grade = maxScore > 0 ? (totalScore / maxScore) * 10 : totalScore / 10;

      return {
        grade: Math.round(grade * 100) / 100, // Round to 2 decimals
        maxGrade: 10,
        isGraded: true,
      };
    } catch (error) {
      console.error(
        `Error calculating grade for submission ${submission.id}:`,
        error
      );
      return { grade: 0, maxGrade: 10, isGraded: false };
    }
  }

  /**
   * Get academic performance statistics with filters
   */
  async getAcademicPerformanceStats(
    filters?: AcademicPerformanceFilters
  ): Promise<AcademicPerformanceStats> {
    try {
      // Fetch all necessary data
      const [allClasses, allSemesters, allClassAssessments] = await Promise.all([
        classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
        semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
        classAssessmentService.getClassAssessments({
          pageNumber: 1,
          pageSize: 1000,
        }),
      ]);

      // Apply filters
      let filteredClasses = allClasses.classes || [];
      let filteredAssessments = allClassAssessments.items || [];

      if (filters?.classId) {
        filteredClasses = filteredClasses.filter((c) => c.id === filters.classId);
        filteredAssessments = filteredAssessments.filter(
          (ca) => ca.classId === filters.classId
        );
      }

      if (filters?.semesterCode) {
        // Filter classes by semester (would need to check semester plan)
        // For now, we'll filter assessments by checking if they belong to classes in that semester
        // This is a simplified approach - in reality, you'd need to check semester plans
      }

      // Get all submissions for filtered assessments
      const allSubmissions: Submission[] = [];
      for (const assessment of filteredAssessments) {
        try {
          const submissions = await submissionService.getSubmissionList({
            classAssessmentId: assessment.id,
          });
          allSubmissions.push(...submissions);
        } catch (error) {
          console.error(
            `Error fetching submissions for assessment ${assessment.id}:`,
            error
          );
        }
      }

      // Calculate grades for all submissions
      const studentGrades = new Map<
        number,
        Array<{ grade: number; maxGrade: number; isGraded: boolean; classAssessment: ClassAssessment }>
      >();

      for (const submission of allSubmissions) {
        const assessment = filteredAssessments.find(
          (ca) => ca.id === submission.classAssessmentId
        );
        if (!assessment) continue;

        const gradeData = await this.calculateStudentGrade(submission, assessment);
        
        if (!studentGrades.has(submission.studentId)) {
          studentGrades.set(submission.studentId, []);
        }
        studentGrades.get(submission.studentId)!.push({
          ...gradeData,
          classAssessment: assessment,
        });
      }

      // Calculate statistics
      let totalGraded = 0;
      let totalGradeSum = 0;
      let passCount = 0;
      let failCount = 0;
      let notGradedCount = 0;

      const gradeDistribution = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        F: 0,
      };

      // Process each student's grades
      const studentAverages = new Map<
        number,
        {
          studentName: string;
          studentCode: string;
          grades: number[];
          classCode: string;
          courseName: string;
        }
      >();

      for (const [studentId, gradeDataList] of studentGrades.entries()) {
        const gradedGrades = gradeDataList.filter((g) => g.isGraded);
        
        if (gradedGrades.length === 0) {
          notGradedCount++;
          continue;
        }

        // Calculate average grade for this student
        const averageGrade =
          gradedGrades.reduce((sum, g) => sum + g.grade, 0) / gradedGrades.length;

        totalGraded++;
        totalGradeSum += averageGrade;

        // Check pass/fail
        if (averageGrade >= PASS_THRESHOLD) {
          passCount++;
        } else {
          failCount++;
        }

        // Grade distribution
        if (averageGrade >= GRADE_THRESHOLDS.A) {
          gradeDistribution.A++;
        } else if (averageGrade >= GRADE_THRESHOLDS.B) {
          gradeDistribution.B++;
        } else if (averageGrade >= GRADE_THRESHOLDS.C) {
          gradeDistribution.C++;
        } else if (averageGrade >= GRADE_THRESHOLDS.D) {
          gradeDistribution.D++;
        } else {
          gradeDistribution.F++;
        }

        // Store student average
        const firstGrade = gradeDataList[0];
        const assessment = firstGrade.classAssessment;
        studentAverages.set(studentId, {
          studentName: allSubmissions.find((s) => s.studentId === studentId)?.studentName || "",
          studentCode: allSubmissions.find((s) => s.studentId === studentId)?.studentCode || "",
          grades: gradedGrades.map((g) => g.grade),
          classCode: assessment.classCode,
          courseName: assessment.courseName,
        });
      }

      // Calculate overall average
      const overallAverageGrade =
        totalGraded > 0 ? totalGradeSum / totalGraded : 0;

      // Calculate pass rate
      const totalGradedForPassRate = passCount + failCount;
      const passRate =
        totalGradedForPassRate > 0
          ? (passCount / totalGradedForPassRate) * 100
          : 0;

      // Calculate averages by class
      const classAverages = new Map<
        number,
        {
          classId: number;
          classCode: string;
          courseName: string;
          grades: number[];
          studentIds: Set<number>;
        }
      >();

      for (const [studentId, studentData] of studentAverages.entries()) {
        const assessment = filteredAssessments.find(
          (ca) => ca.classCode === studentData.classCode
        );
        if (!assessment) continue;

        const classId = assessment.classId;
        if (!classAverages.has(classId)) {
          classAverages.set(classId, {
            classId,
            classCode: studentData.classCode,
            courseName: studentData.courseName,
            grades: [],
            studentIds: new Set(),
          });
        }

        const classData = classAverages.get(classId)!;
        if (!classData.studentIds.has(studentId)) {
          const studentAvg =
            studentData.grades.reduce((sum, g) => sum + g, 0) /
            studentData.grades.length;
          classData.grades.push(studentAvg);
          classData.studentIds.add(studentId);
        }
      }

      const averageGradeByClass = Array.from(classAverages.values())
        .map((classData) => {
          const avg =
            classData.grades.length > 0
              ? classData.grades.reduce((sum, g) => sum + g, 0) /
                classData.grades.length
              : 0;
          const passCount = classData.grades.filter((g) => g >= PASS_THRESHOLD).length;
          const failCount = classData.grades.filter((g) => g < PASS_THRESHOLD).length;

          return {
            classId: classData.classId,
            classCode: classData.classCode,
            courseName: classData.courseName,
            averageGrade: Math.round(avg * 100) / 100,
            studentCount: classData.studentIds.size,
            passCount,
            failCount,
          };
        })
        .sort((a, b) => b.averageGrade - a.averageGrade);

      // Top students
      const topStudents = Array.from(studentAverages.entries())
        .map(([studentId, studentData]) => {
          const avg =
            studentData.grades.length > 0
              ? studentData.grades.reduce((sum, g) => sum + g, 0) /
                studentData.grades.length
              : 0;
          return {
            studentId,
            studentName: studentData.studentName,
            studentCode: studentData.studentCode,
            averageGrade: Math.round(avg * 100) / 100,
            classCode: studentData.classCode,
            courseName: studentData.courseName,
          };
        })
        .sort((a, b) => b.averageGrade - a.averageGrade)
        .slice(0, 20);

      // Top classes
      const topClasses = averageGradeByClass
        .map((classData) => ({
          ...classData,
          passRate:
            classData.studentCount > 0
              ? (classData.passCount / classData.studentCount) * 100
              : 0,
        }))
        .sort((a, b) => b.averageGrade - a.averageGrade)
        .slice(0, 20);

      // Calculate submission and grading rates
      const totalStudents = new Set(allSubmissions.map((s) => s.studentId)).size;
      const submissionRate =
        totalStudents > 0 ? (allSubmissions.length / totalStudents) * 100 : 0;
      const gradingCompletionRate =
        allSubmissions.length > 0
          ? (totalGraded / allSubmissions.length) * 100
          : 0;

      return {
        totalStudents,
        totalClasses: filteredClasses.length,
        totalCourses: new Set(filteredAssessments.map((ca) => ca.courseName)).size,
        totalAssessments: filteredAssessments.length,
        totalSubmissions: allSubmissions.length,
        gradedSubmissions: totalGraded,
        passCount,
        failCount,
        passRate: Math.round(passRate * 100) / 100,
        notGradedCount,
        overallAverageGrade: Math.round(overallAverageGrade * 100) / 100,
        averageGradeByClass,
        averageGradeByCourse: [], // TODO: Implement course-based grouping
        averageGradeBySemester: [], // TODO: Implement semester-based grouping
        gradeDistribution,
        topStudents,
        topClasses,
        submissionRate: Math.round(submissionRate * 100) / 100,
        gradingCompletionRate: Math.round(gradingCompletionRate * 100) / 100,
      };
    } catch (error) {
      console.error("Error calculating academic performance stats:", error);
      throw error;
    }
  }
}

export const academicPerformanceService = new AcademicPerformanceService();

