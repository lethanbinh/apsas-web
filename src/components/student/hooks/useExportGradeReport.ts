import { ROLES } from "@/lib/constants";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { ClassInfo as ClassInfoType, classService } from "@/services/classService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { gradeItemService } from "@/services/gradeItemService";
import { GradingGroup, gradingGroupService } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import { lecturerService } from "@/services/lecturerService";
import { rubricItemService } from "@/services/rubricItemService";
import { Submission, submissionService } from "@/services/submissionService";
import { exportGradeReportToExcel, GradeReportData } from "@/utils/exportGradeReport";
import { App } from "antd";
interface ExportTypes {
  assignment: boolean;
  lab: boolean;
  practicalExam: boolean;
}
interface UseExportGradeReportParams {
  user: { role: number; id?: string | number } | null;
  studentId?: number | null;
  classData: ClassInfoType;
  gradingGroups: GradingGroup[];
}
export const useExportGradeReport = ({
  user,
  studentId,
  classData,
  gradingGroups,
}: UseExportGradeReportParams) => {
  const { message: messageApi } = App.useApp();
  const handleConfirmExport = async (exportTypes: ExportTypes) => {
    try {
      if (!exportTypes.assignment && !exportTypes.lab && !exportTypes.practicalExam) {
        messageApi.warning("Please select at least one type to export");
        return;
      }
      messageApi.info("Preparing report...");
      if (user?.role === ROLES.LECTURER) {
        await exportLecturerReport(exportTypes, classData, gradingGroups, user);
      } else if (user?.role === ROLES.STUDENT) {
        await exportStudentReport(exportTypes, classData, studentId);
      }
    } catch (err: any) {
      console.error("Export error:", err);
      messageApi.error(err.message || "Export failed. Please check browser console for details.");
    }
  };
  return { handleConfirmExport };
};
async function exportLecturerReport(
  exportTypes: ExportTypes,
  classData: ClassInfoType,
  gradingGroups: GradingGroup[],
  user: { id?: string | number }
) {
  const { message: messageApi } = App.useApp();
  const selectedClassId = classData.id.toString();
  if (!selectedClassId) {
    messageApi.error("Class ID not found");
    return;
  }
  const courseElementsRes = await courseElementService.getCourseElements({
    pageNumber: 1,
    pageSize: 1000,
  });
  const classAssessmentRes = await classAssessmentService.getClassAssessments({
    classId: Number(selectedClassId),
    pageNumber: 1,
    pageSize: 1000,
  });
  const allCourseElements = courseElementsRes.filter(ce => {
    const classAssessment = classAssessmentRes.items.find(ca => ca.courseElementId === ce.id);
    return classAssessment && classAssessment.classId === Number(selectedClassId) && ce.elementType !== 2;
  });
  const reportData: GradeReportData[] = [];
  if (exportTypes.practicalExam && user?.id) {
    await processPracticalExamForLecturer(String(user.id), reportData, gradingGroups);
  }
  for (const courseElement of allCourseElements) {
    const classAssessment = classAssessmentRes.items.find(ca => ca.courseElementId === courseElement.id);
    if (!classAssessment) continue;
    let assignmentType: "Assignment" | "Lab" | "Practical Exam" = "Assignment";
    if (courseElement.elementType === 1) {
      assignmentType = "Lab";
    }
    if (assignmentType === "Assignment" && !exportTypes.assignment) continue;
    if (assignmentType === "Lab" && !exportTypes.lab) continue;
    await processCourseElementForLecturer(
      courseElement,
      classAssessment,
      selectedClassId,
      gradingGroups,
      reportData
    );
  }
  if (reportData.length === 0) {
    messageApi.warning("No data available to export");
    return;
  }
  console.log("Exporting report with", reportData.length, "submissions");
  await exportGradeReportToExcel(reportData, "Full_Grade_Report");
  messageApi.success("Full grade report exported successfully");
}
async function exportStudentReport(
  exportTypes: ExportTypes,
  classData: ClassInfoType,
  studentId?: number | null
) {
  const { message: messageApi } = App.useApp();
  if (!studentId) {
    messageApi.error("Student ID not found");
    return;
  }
  const reportData: GradeReportData[] = [];
  const allSubmissions = await submissionService.getSubmissionList({
    studentId: studentId,
  });
  const peSubmissions = allSubmissions.filter(s => s.gradingGroupId !== null && s.gradingGroupId !== undefined);
  const otherSubmissions = allSubmissions.filter(s => !s.gradingGroupId);
  const classAssessmentIds = Array.from(
    new Set(otherSubmissions.map((s) => s.classAssessmentId).filter((id) => id !== null && id !== undefined))
  );
  const classId = classData.id.toString();
  if (!classId) {
    messageApi.error("Class ID not found");
    return;
  }
  const classAssessmentsRes = await classAssessmentService.getClassAssessments({
    classId: Number(classId),
    pageNumber: 1,
    pageSize: 1000,
  }).catch(() => ({ items: [] }));
  const courseElementsRes = await courseElementService.getCourseElements({
    pageNumber: 1,
    pageSize: 1000,
  }).catch(() => []);
  const courseElementMap = new Map(courseElementsRes.map(ce => [ce.id, ce]));
  await processCourseElementsForStudent(
    classAssessmentIds,
    classAssessmentsRes.items,
    courseElementMap,
    otherSubmissions,
    exportTypes,
    reportData
  );
  if (exportTypes.practicalExam && peSubmissions.length > 0) {
    await processPracticalExamForStudent(peSubmissions, reportData);
  }
  if (reportData.length === 0) {
    messageApi.warning("No data available to export");
    return;
  }
  console.log("Exporting report for student:", studentId);
  await exportGradeReportToExcel(reportData, `Grade_Report_${studentId}`);
  messageApi.success("Report exported successfully");
}
async function processPracticalExamForLecturer(
  userId: string,
  reportData: GradeReportData[],
  gradingGroups: GradingGroup[]
) {
  try {
    const lecturerList = await lecturerService.getLecturerList();
    const currentLecturer = lecturerList.find(
      (l) => l.accountId === userId.toString()
    );
    if (!currentLecturer) return;
    const lecturerId = Number(currentLecturer.lecturerId);
    const allGradingGroups = await gradingGroupService.getGradingGroups({
      lecturerId: lecturerId,
    });
    const allPESubmissions: Submission[] = [];
    for (const group of allGradingGroups) {
      const groupSubmissions = await submissionService.getSubmissionList({
        gradingGroupId: group.id,
      }).catch(() => []);
      allPESubmissions.push(...groupSubmissions);
    }
    const assessmentTemplateIds = Array.from(
      new Set(
        allGradingGroups
          .filter((g) => g.assessmentTemplateId !== null && g.assessmentTemplateId !== undefined)
          .map((g) => Number(g.assessmentTemplateId))
      )
    );
    const assessmentTemplateMap = new Map<number, AssessmentTemplate>();
    if (assessmentTemplateIds.length > 0) {
      const allAssessmentTemplatesRes = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      }).catch(() => ({ items: [] }));
      allAssessmentTemplatesRes.items.forEach((template) => {
        if (assessmentTemplateIds.includes(template.id)) {
          assessmentTemplateMap.set(template.id, template);
        }
      });
    }
    const courseElementIds = Array.from(
      new Set(Array.from(assessmentTemplateMap.values()).map((t) => t.courseElementId))
    );
    const courseElementMap = new Map<number, CourseElement>();
    if (courseElementIds.length > 0) {
      const allCourseElementsRes = await courseElementService.getCourseElements({
        pageNumber: 1,
        pageSize: 1000,
      }).catch(() => []);
      allCourseElementsRes.forEach((element) => {
        if (courseElementIds.includes(element.id)) {
          courseElementMap.set(element.id, element);
        }
      });
    }
    for (const group of allGradingGroups) {
      const groupSubmissions = allPESubmissions.filter(s => s.gradingGroupId === group.id);
      if (groupSubmissions.length === 0) continue;
      const assessmentTemplate = group.assessmentTemplateId ? assessmentTemplateMap.get(Number(group.assessmentTemplateId)) : null;
      if (!assessmentTemplate) continue;
      const courseElement = courseElementMap.get(Number(assessmentTemplate.courseElementId));
      if (!courseElement) continue;
      const { questions, rubrics } = await fetchQuestionsAndRubrics(assessmentTemplate.id);
      for (const submission of groupSubmissions) {
        const { gradingSession, gradeItems } = await fetchGradingData(submission.id);
        reportData.push({
          submission,
          gradingSession,
          gradeItems,
          questions,
          rubrics,
          feedback: {
            overallFeedback: "",
            strengths: "",
            weaknesses: "",
            codeQuality: "",
            algorithmEfficiency: "",
            suggestionsForImprovement: "",
            bestPractices: "",
            errorHandling: "",
          },
          courseElementName: courseElement.name,
          assignmentType: "Practical Exam",
        });
      }
    }
  } catch (err) {
    console.error("Failed to fetch PE data:", err);
  }
}
async function processCourseElementForLecturer(
  courseElement: CourseElement,
  classAssessment: any,
  selectedClassId: string,
  gradingGroups: GradingGroup[],
  reportData: GradeReportData[]
) {
  const allStudents = await classService.getStudentsInClass(Number(selectedClassId)).catch(() => []);
  const submissions = await submissionService.getSubmissionList({
    classAssessmentId: classAssessment.id,
  }).catch(() => []);
  const submissionMap = new Map<number, Submission>();
  for (const submission of submissions) {
    if (submission.studentId) {
      submissionMap.set(submission.studentId, submission);
    }
  }
  let assessmentTemplateId: number | null = classAssessment.assessmentTemplateId || null;
  if (!assessmentTemplateId && submissions.length > 0) {
    const firstSubmission = submissions[0];
    if (firstSubmission.gradingGroupId) {
      const gradingGroup = gradingGroups.find(g => g.id === firstSubmission.gradingGroupId);
      assessmentTemplateId = gradingGroup?.assessmentTemplateId || null;
    }
  }
  let questions: any[] = [];
  const rubrics: { [questionId: number]: any[] } = {};
  if (assessmentTemplateId !== null) {
    const result = await fetchQuestionsAndRubrics(assessmentTemplateId);
    questions = result.questions;
    Object.assign(rubrics, result.rubrics);
  }
  for (const student of allStudents) {
    const submission = submissionMap.get(student.studentId) || null;
    const { gradingSession, gradeItems } = await fetchGradingData(submission?.id);
    const assignmentTypeFromName = (() => {
      const nameLower = (courseElement.name || "").toLowerCase();
      if (nameLower.includes("lab") || nameLower.includes("thực hành")) {
        return "Lab";
      } else if (nameLower.includes("exam") || nameLower.includes("pe") || nameLower.includes("practical") ||
                 nameLower.includes("thi thực hành") || nameLower.includes("kiểm tra thực hành")) {
        return "Practical Exam";
      }
      return "Assignment";
    })();
    const submissionData: Submission = submission || {
      id: 0,
      studentId: student.studentId,
      studentCode: student.studentCode || "",
      studentName: student.studentName || "",
      classAssessmentId: classAssessment.id,
      submittedAt: "",
      lastGrade: 0,
      status: 0,
      createdAt: "",
      updatedAt: "",
      submissionFile: null,
    };
    reportData.push({
      submission: submissionData,
      gradingSession,
      gradeItems,
      questions,
      rubrics,
      feedback: {
        overallFeedback: "",
        strengths: "",
        weaknesses: "",
        codeQuality: "",
        algorithmEfficiency: "",
        suggestionsForImprovement: "",
        bestPractices: "",
        errorHandling: "",
      },
      courseElementName: courseElement.name,
      assignmentType: assignmentTypeFromName,
    });
  }
}
async function processCourseElementsForStudent(
  classAssessmentIds: number[],
  classAssessments: any[],
  courseElementMap: Map<number, CourseElement>,
  otherSubmissions: Submission[],
  exportTypes: ExportTypes,
  reportData: GradeReportData[]
) {
  const courseElementSubmissionsMap = new Map<number, Submission[]>();
  for (const classAssessmentId of classAssessmentIds) {
    if (!classAssessmentId) continue;
    const classAssessment = classAssessments.find(ca => ca.id === classAssessmentId);
    if (!classAssessment) continue;
    const courseElement = courseElementMap.get(classAssessment.courseElementId || 0);
    if (!courseElement) continue;
    const assignmentType: "Assignment" | "Lab" | "Practical Exam" = (() => {
      const nameLower = (courseElement.name || "").toLowerCase();
      if (nameLower.includes("lab") || nameLower.includes("thực hành")) {
        return "Lab";
      }
      return "Assignment";
    })();
    if (assignmentType === "Assignment" && !exportTypes.assignment) continue;
    if (assignmentType === "Lab" && !exportTypes.lab) continue;
    const submissions = otherSubmissions.filter((s) => s.classAssessmentId === classAssessmentId);
    const courseElementId = courseElement.id;
    if (!courseElementSubmissionsMap.has(courseElementId)) {
      courseElementSubmissionsMap.set(courseElementId, []);
    }
    courseElementSubmissionsMap.get(courseElementId)!.push(...submissions);
  }
  for (const [courseElementId, submissions] of courseElementSubmissionsMap.entries()) {
    const courseElement = courseElementMap.get(courseElementId);
    if (!courseElement) continue;
    const classAssessment = classAssessments.find(ca => ca.courseElementId === courseElementId);
    if (!classAssessment) continue;
    const assignmentType: "Assignment" | "Lab" | "Practical Exam" = (() => {
      const nameLower = (courseElement.name || "").toLowerCase();
      if (nameLower.includes("lab") || nameLower.includes("thực hành")) {
        return "Lab";
      } else if (nameLower.includes("exam") || nameLower.includes("pe") || nameLower.includes("practical") ||
                 nameLower.includes("thi thực hành") || nameLower.includes("kiểm tra thực hành")) {
        return "Practical Exam";
      }
      return "Assignment";
    })();
    let questions: any[] = [];
    const rubrics: { [questionId: number]: any[] } = {};
    let assessmentTemplateId: number | null = classAssessment.assessmentTemplateId || null;
    if (assessmentTemplateId !== null) {
      const result = await fetchQuestionsAndRubrics(assessmentTemplateId);
      questions = result.questions;
      Object.assign(rubrics, result.rubrics);
    }
    const { latestSubmission, latestGradingSession, allGradeItems } =
      await findLatestSubmissionAndGrading(submissions);
    if (!latestSubmission) continue;
    reportData.push({
      submission: latestSubmission,
      gradingSession: latestGradingSession,
      gradeItems: allGradeItems,
      questions,
      rubrics,
      feedback: {
        overallFeedback: "",
        strengths: "",
        weaknesses: "",
        codeQuality: "",
        algorithmEfficiency: "",
        suggestionsForImprovement: "",
        bestPractices: "",
        errorHandling: "",
      },
      courseElementName: courseElement.name,
      assignmentType,
    });
  }
}
async function processPracticalExamForStudent(
  peSubmissions: Submission[],
  reportData: GradeReportData[]
) {
  try {
    const gradingGroupIds = Array.from(
      new Set(peSubmissions.map(s => s.gradingGroupId).filter(id => id !== null && id !== undefined))
    );
    const allGradingGroups = await Promise.all(
      gradingGroupIds.map(id =>
        gradingGroupService.getGradingGroups({}).then(groups =>
          groups.find(g => g.id === id)
        ).catch(() => null)
      )
    );
    const gradingGroupsMap = new Map<number, GradingGroup>();
    allGradingGroups.forEach(group => {
      if (group) {
        gradingGroupsMap.set(group.id, group);
      }
    });
    const assessmentTemplateIds = Array.from(
      new Set(
        Array.from(gradingGroupsMap.values())
          .filter((g) => g.assessmentTemplateId !== null && g.assessmentTemplateId !== undefined)
          .map((g) => Number(g.assessmentTemplateId))
      )
    );
    const assessmentTemplateMap = new Map<number, AssessmentTemplate>();
    if (assessmentTemplateIds.length > 0) {
      const allAssessmentTemplatesRes = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      }).catch(() => ({ items: [] }));
      allAssessmentTemplatesRes.items.forEach((template) => {
        if (assessmentTemplateIds.includes(template.id)) {
          assessmentTemplateMap.set(template.id, template);
        }
      });
    }
    const courseElementIds = Array.from(
      new Set(Array.from(assessmentTemplateMap.values()).map((t) => t.courseElementId))
    );
    const peCourseElementMap = new Map<number, CourseElement>();
    if (courseElementIds.length > 0) {
      const allCourseElementsRes = await courseElementService.getCourseElements({
        pageNumber: 1,
        pageSize: 1000,
      }).catch(() => []);
      allCourseElementsRes.forEach((element) => {
        if (courseElementIds.includes(element.id)) {
          peCourseElementMap.set(element.id, element);
        }
      });
    }
    const peSubmissionsByGroup = new Map<number, Submission[]>();
    for (const submission of peSubmissions) {
      if (!submission.gradingGroupId) continue;
      if (!peSubmissionsByGroup.has(submission.gradingGroupId)) {
        peSubmissionsByGroup.set(submission.gradingGroupId, []);
      }
      peSubmissionsByGroup.get(submission.gradingGroupId)!.push(submission);
    }
    for (const [gradingGroupId, groupSubmissions] of peSubmissionsByGroup.entries()) {
      const gradingGroup = gradingGroupsMap.get(gradingGroupId);
      if (!gradingGroup || !gradingGroup.assessmentTemplateId) continue;
      const assessmentTemplate = assessmentTemplateMap.get(Number(gradingGroup.assessmentTemplateId));
      if (!assessmentTemplate) continue;
      const courseElement = peCourseElementMap.get(Number(assessmentTemplate.courseElementId));
      if (!courseElement) continue;
      const { questions, rubrics } = await fetchQuestionsAndRubrics(assessmentTemplate.id);
      const { latestSubmission, latestGradingSession, allGradeItems } =
        await findLatestSubmissionAndGrading(groupSubmissions);
      if (!latestSubmission) continue;
      reportData.push({
        submission: latestSubmission,
        gradingSession: latestGradingSession,
        gradeItems: allGradeItems,
        questions,
        rubrics,
        feedback: {
          overallFeedback: "",
          strengths: "",
          weaknesses: "",
          codeQuality: "",
          algorithmEfficiency: "",
          suggestionsForImprovement: "",
          bestPractices: "",
          errorHandling: "",
        },
        courseElementName: courseElement.name,
        assignmentType: "Practical Exam",
      });
    }
  } catch (err) {
    console.error("Failed to fetch PE data:", err);
  }
}
async function fetchQuestionsAndRubrics(assessmentTemplateId: number) {
  let questions: any[] = [];
  const rubrics: { [questionId: number]: any[] } = {};
  try {
    const papersRes = await assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplateId,
      pageNumber: 1,
      pageSize: 100,
    });
    for (const paper of papersRes.items) {
      const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
        assessmentPaperId: paper.id,
        pageNumber: 1,
        pageSize: 100,
      });
      questions = [...questions, ...questionsRes.items];
      for (const question of questionsRes.items) {
        const rubricsRes = await rubricItemService.getRubricsForQuestion({
          assessmentQuestionId: question.id,
          pageNumber: 1,
          pageSize: 100,
        });
        rubrics[question.id] = rubricsRes.items;
      }
    }
  } catch (err) {
    console.error(`Failed to fetch questions/rubrics for template ${assessmentTemplateId}:`, err);
  }
  return { questions, rubrics };
}
async function fetchGradingData(submissionId?: number) {
  let gradingSession = null;
  let gradeItems: any[] = [];
  if (!submissionId) {
    return { gradingSession, gradeItems };
  }
  try {
    const gradingSessionsResult = await gradingService.getGradingSessions({
      submissionId: submissionId,
    });
    if (gradingSessionsResult.items.length > 0) {
      gradingSession = gradingSessionsResult.items.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      const gradeItemsResult = await gradeItemService.getGradeItems({
        gradingSessionId: gradingSession.id,
      });
      gradeItems = gradeItemsResult.items;
    }
  } catch (err) {
    console.error(`Failed to fetch grading data for submission ${submissionId}:`, err);
  }
  return { gradingSession, gradeItems };
}
async function findLatestSubmissionAndGrading(submissions: Submission[]) {
  let latestSubmission: Submission | null = null;
  let allGradeItems: any[] = [];
  let latestGradingSession = null;
  let latestSubmissionWithGrading: Submission | null = null;
  for (const submission of submissions) {
    if (submission.submittedAt && submission.submittedAt !== "") {
      if (!latestSubmission || new Date(submission.submittedAt).getTime() > new Date(latestSubmission.submittedAt).getTime()) {
        latestSubmission = submission;
      }
    } else if (!latestSubmission) {
      latestSubmission = submission;
    }
    try {
      const gradingSessionsResult = await gradingService.getGradingSessions({
        submissionId: submission.id,
      });
      if (gradingSessionsResult.items.length > 0) {
        const gradingSession = gradingSessionsResult.items.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        if (!latestGradingSession || new Date(gradingSession.createdAt).getTime() > new Date(latestGradingSession.createdAt).getTime()) {
          latestGradingSession = gradingSession;
          latestSubmissionWithGrading = submission;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch grading data for submission ${submission.id}:`, err);
    }
  }
  if (latestGradingSession && latestSubmissionWithGrading) {
    try {
      const gradeItemsResult = await gradeItemService.getGradeItems({
        gradingSessionId: latestGradingSession.id,
      });
      allGradeItems = gradeItemsResult.items;
    } catch (err) {
      console.error(`Failed to fetch grade items for grading session ${latestGradingSession.id}:`, err);
    }
  }
  return {
    latestSubmission: latestSubmission || submissions[0],
    latestGradingSession,
    allGradeItems,
  };
}