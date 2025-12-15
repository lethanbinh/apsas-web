import { classService } from "./classService";
import { classAssessmentService, ClassAssessment } from "./classAssessmentService";
import { submissionService, Submission } from "./submissionService";
import { gradingService, GradingSession } from "./gradingService";
import { gradeItemService, GradeItem } from "./gradeItemService";
import { semesterService, Semester } from "./semesterService";
import { courseElementService } from "./courseElementService";


const PASS_THRESHOLD = 5.0;


const GRADE_THRESHOLDS = {
  A: 8.5,
  B: 7.0,
  C: 5.5,
  D: 4.0,
  F: 0,
};

export interface AcademicPerformanceStats {

  totalStudents: number;
  totalClasses: number;
  totalCourses: number;
  totalAssessments: number;
  totalSubmissions: number;
  gradedSubmissions: number;


  passCount: number;
  failCount: number;
  passRate: number;
  notGradedCount: number;


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


  gradeDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };


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


  submissionRate: number;
  gradingCompletionRate: number;
}

export interface AcademicPerformanceFilters {
  classId?: number;
  courseId?: number;
  semesterCode?: string;
}

export class AcademicPerformanceService {

  private async calculateStudentGrade(
    submission: Submission,
    classAssessment: ClassAssessment
  ): Promise<{ grade: number; maxGrade: number; isGraded: boolean }> {
    try {

      const gradingSessionsResult = await gradingService.getGradingSessions({
        submissionId: submission.id,
        pageNumber: 1,
        pageSize: 100,
      });

      if (gradingSessionsResult.items.length === 0) {
        return { grade: 0, maxGrade: 100, isGraded: false };
      }


      const completedSessions = gradingSessionsResult.items.filter(
        (s) => s.status === 1
      );

      if (completedSessions.length === 0) {
        return { grade: 0, maxGrade: 100, isGraded: false };
      }


      const latestSession = completedSessions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];


      const gradeItemsResult = await gradeItemService.getGradeItems({
        gradingSessionId: latestSession.id,
        pageNumber: 1,
        pageSize: 1000,
      });

      const gradeItems = gradeItemsResult.items;

      if (gradeItems.length === 0) {

        return {
          grade: latestSession.grade,
          maxGrade: 100,
          isGraded: true,
        };
      }


      const totalScore = gradeItems.reduce((sum, item) => sum + item.score, 0);
      const maxScore = gradeItems.reduce(
        (sum, item) => sum + item.rubricItemMaxScore,
        0
      );


      const grade = maxScore > 0 ? (totalScore / maxScore) * 10 : totalScore / 10;

      return {
        grade: Math.round(grade * 100) / 100,
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


  async getAcademicPerformanceStats(
    filters?: AcademicPerformanceFilters
  ): Promise<AcademicPerformanceStats> {
    try {

      const [allClasses, allSemesters, allClassAssessments] = await Promise.all([
        classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
        semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
        classAssessmentService.getClassAssessments({
          pageNumber: 1,
          pageSize: 1000,
        }),
      ]);


      let filteredClasses = allClasses.classes || [];
      let filteredAssessments = allClassAssessments.items || [];

      if (filters?.classId) {
        filteredClasses = filteredClasses.filter((c) => c.id === filters.classId);
        filteredAssessments = filteredAssessments.filter(
          (ca) => ca.classId === filters.classId
        );
      }

      if (filters?.semesterCode) {



      }


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


        const averageGrade =
          gradedGrades.reduce((sum, g) => sum + g.grade, 0) / gradedGrades.length;

        totalGraded++;
        totalGradeSum += averageGrade;


        if (averageGrade >= PASS_THRESHOLD) {
          passCount++;
        } else {
          failCount++;
        }


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


      const overallAverageGrade =
        totalGraded > 0 ? totalGradeSum / totalGraded : 0;


      const totalGradedForPassRate = passCount + failCount;
      const passRate =
        totalGradedForPassRate > 0
          ? (passCount / totalGradedForPassRate) * 100
          : 0;


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
        averageGradeByCourse: [],
        averageGradeBySemester: [],
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

