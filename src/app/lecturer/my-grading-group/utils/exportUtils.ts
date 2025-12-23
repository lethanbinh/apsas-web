import { assessmentPaperService } from "@/services/assessmentPaperService";
import type { AssessmentQuestion } from "@/services/assessmentQuestionService";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { courseElementService } from "@/services/courseElementService";
import { gradeItemService } from "@/services/gradeItemService";
import type { GradingGroup } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import type { RubricItem } from "@/services/rubricItemService";
import { rubricItemService } from "@/services/rubricItemService";
import { submissionService } from "@/services/submissionService";
import { exportGradeReportToExcel, GradeReportData } from "@/utils/exportGradeReport";
import type { MessageInstance } from "antd/es/message/interface";
export async function exportGradeReport(
  gradingGroup: GradingGroup,
  messageApi: MessageInstance
): Promise<void> {
  try {
    messageApi.info("Preparing grade report...");
    const groupSubmissions = await submissionService.getSubmissionList({
      gradingGroupId: gradingGroup.id,
    });
    if (groupSubmissions.length === 0) {
      messageApi.warning("No submissions found for this grading group");
      return;
    }
    if (!gradingGroup.assessmentTemplateId) {
      messageApi.error("Assessment template not found");
      return;
    }
    const templatesRes = await assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    });
    const assessmentTemplate = templatesRes.items.find(
      (t) => t.id === gradingGroup.assessmentTemplateId
    );
    if (!assessmentTemplate) {
      messageApi.error("Assessment template not found");
      return;
    }
    if (!assessmentTemplate.courseElementId) {
      messageApi.error("Course element not found");
      return;
    }
    const courseElements = await courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
    });
    const courseElement = courseElements.find(
      (ce) => ce.id === assessmentTemplate.courseElementId
    );
    if (!courseElement) {
      messageApi.error("Course element not found");
      return;
    }
    let questions: AssessmentQuestion[] = [];
    const rubrics: { [questionId: number]: RubricItem[] } = {};
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
      const assignmentType: "Assignment" | "Lab" | "Practical Exam" =
        courseElement.elementType === 2 ? "Practical Exam" : "Assignment";
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
      messageApi.warning("No data available to export");
      return;
    }
    await exportGradeReportToExcel(
      reportData,
      `Grade_Report_${gradingGroup.assessmentTemplateName || gradingGroup.id}`
    );
    messageApi.success("Grade report exported successfully");
  } catch (err: any) {
    console.error("Export error:", err);
    messageApi.error(err.message || "Export failed. Please check browser console for details.");
  }
}