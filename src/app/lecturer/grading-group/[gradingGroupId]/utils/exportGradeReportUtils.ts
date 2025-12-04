import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { courseElementService } from "@/services/courseElementService";
import { gradeItemService } from "@/services/gradeItemService";
import { gradingService } from "@/services/gradingService";
import { rubricItemService } from "@/services/rubricItemService";
import { submissionService } from "@/services/submissionService";
import { exportGradeReportToExcel, GradeReportData } from "@/utils/exportGradeReport";
import type { GradingGroup } from "@/services/gradingGroupService";

export async function exportGradeReport(gradingGroup: GradingGroup) {
  // Get all submissions for this grading group
  const groupSubmissions = await submissionService.getSubmissionList({
    gradingGroupId: gradingGroup.id,
  });

  if (groupSubmissions.length === 0) {
    throw new Error("No submissions found for this grading group");
  }

  // Get assessment template
  if (!gradingGroup.assessmentTemplateId) {
    throw new Error("Assessment template not found");
  }

  const templatesRes = await assessmentTemplateService.getAssessmentTemplates({
    pageNumber: 1,
    pageSize: 1000,
  });
  const assessmentTemplate = templatesRes.items.find(
    (t) => t.id === gradingGroup.assessmentTemplateId
  );

  if (!assessmentTemplate) {
    throw new Error("Assessment template not found");
  }

  // Get course element
  if (!assessmentTemplate.courseElementId) {
    throw new Error("Course element not found");
  }

  const courseElements = await courseElementService.getCourseElements({
    pageNumber: 1,
    pageSize: 1000,
  });
  const courseElement = courseElements.find(
    (ce) => ce.id === assessmentTemplate.courseElementId
  );

  if (!courseElement) {
    throw new Error("Course element not found");
  }

  // Fetch questions and rubrics
  let questions: AssessmentQuestion[] = [];
  const rubrics: { [questionId: number]: any[] } = {};

  try {
    const papersRes = await assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplate.id,
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
    console.error("Failed to fetch questions/rubrics:", err);
  }

  // Prepare report data
  const reportData: GradeReportData[] = [];

  for (const submission of groupSubmissions) {
    let gradingSession = null;
    let gradeItems: any[] = [];

    try {
      const gradingSessionsResult = await gradingService.getGradingSessions({
        submissionId: submission.id,
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
      console.error(`Failed to fetch grading data for submission ${submission.id}:`, err);
    }

    // Determine assignment type from elementType field
    const assignmentType: "Assignment" | "Lab" | "Practical Exam" = 
      courseElement.elementType === 2 ? "Practical Exam" :
      "Assignment";

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
      assignmentType: assignmentType,
    });
  }

  if (reportData.length === 0) {
    throw new Error("No data available to export");
  }

  await exportGradeReportToExcel(
    reportData,
    `Grade_Report_${gradingGroup.assessmentTemplateName || gradingGroup.id}`
  );

  return reportData;
}

