import { Submission } from "@/services/submissionService";
import { GradingSession, GradeItem } from "@/services/gradingService";
import { FeedbackData } from "@/services/geminiService";
import { AssessmentQuestion } from "@/services/assessmentQuestionService";
import { RubricItem } from "@/services/rubricItemService";
import * as XLSX from "xlsx";
export interface GradeReportData {
  submission: Submission;
  gradingSession?: GradingSession | null;
  gradeItems: GradeItem[];
  questions: AssessmentQuestion[];
  rubrics: { [questionId: number]: RubricItem[] };
  feedback: FeedbackData;
  courseElementName?: string;
  assignmentType?: "Assignment" | "Lab" | "Practical Exam";
}
function getAssignmentTypeFromName(courseElementName: string): "Assignment" | "Lab" | "Practical Exam" {
  const nameLower = (courseElementName || "").toLowerCase();
  if (nameLower.includes("lab") || nameLower.includes("thực hành")) {
    return "Lab";
  } else if (nameLower.includes("exam") || nameLower.includes("pe") || nameLower.includes("practical") ||
             nameLower.includes("thi thực hành") || nameLower.includes("kiểm tra thực hành")) {
    return "Practical Exam";
  }
  return "Assignment";
}
export async function exportGradeReportToExcel(
  reportData: GradeReportData[],
  fileName: string = "Grade_Report"
) {
  if (typeof window === "undefined") {
    throw new Error("Export is only available in the browser.");
  }
  const wb = XLSX.utils.book_new();
  const exportData: any[] = [];
  const studentMap = new Map<string, { studentCode: string; studentName: string; reports: GradeReportData[] }>();
  for (const data of reportData) {
    const studentId = data.submission.studentId?.toString() || "0";
    const studentCode = data.submission.studentCode || "";
    const studentName = data.submission.studentName || "";
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, {
        studentCode,
        studentName,
        reports: []
      });
    }
    studentMap.get(studentId)!.reports.push(data);
  }
  console.log(`Total students to export: ${studentMap.size}`);
  for (const [studentId, studentData] of studentMap.entries()) {
    const { studentCode, studentName, reports: studentReports } = studentData;
    let isFirstStudentRow = true;
    const courseElementMap = new Map<string, GradeReportData[]>();
    for (const report of studentReports) {
      const courseElementName = report.courseElementName || "N/A";
      if (!courseElementMap.has(courseElementName)) {
        courseElementMap.set(courseElementName, []);
      }
      courseElementMap.get(courseElementName)!.push(report);
    }
    for (const [courseElementName, courseElementReports] of courseElementMap.entries()) {
      let isFirstCourseElementRow = true;
      const assignmentType = getAssignmentTypeFromName(courseElementName);
      const criteriaMap = new Map<string, {
        question: string;
        criteria: string;
        score: number | string;
        maxScore: number;
        comments: string;
        submissionId: number;
        submittedAt: string;
        totalScore: string;
      }>();
      const allQuestionsMap = new Map<number, AssessmentQuestion>();
      const allRubricsMap = new Map<number, Map<number, RubricItem>>();
      for (const report of courseElementReports) {
        for (const question of report.questions) {
          if (!allQuestionsMap.has(question.id)) {
            allQuestionsMap.set(question.id, question);
          }
        }
        for (const questionId in report.rubrics) {
          const questionRubrics = report.rubrics[questionId] || [];
          if (!allRubricsMap.has(Number(questionId))) {
            allRubricsMap.set(Number(questionId), new Map());
          }
          const rubricMap = allRubricsMap.get(Number(questionId))!;
          for (const rubric of questionRubrics) {
            if (!rubricMap.has(rubric.id)) {
              rubricMap.set(rubric.id, rubric);
            }
          }
        }
      }
      const questions = Array.from(allQuestionsMap.values());
      const rubrics: { [questionId: number]: RubricItem[] } = {};
      for (const [questionId, rubricMap] of allRubricsMap.entries()) {
        rubrics[questionId] = Array.from(rubricMap.values());
      }
      let calculatedMaxScore = 0;
      if (questions.length > 0) {
        for (const question of questions) {
          const questionRubrics = rubrics[question.id] || [];
          calculatedMaxScore += questionRubrics.reduce((sum, rubric) => sum + (rubric.score || 0), 0);
        }
      }
      let latestSubmission: Submission | null = null;
      let allGradeItems: GradeItem[] = [];
      let latestGradingSession: GradingSession | null = null;
      let latestReport: GradeReportData | null = null;
      let hasSubmission = false;
      for (const report of courseElementReports) {
        const { submission, gradeItems, gradingSession } = report;
        hasSubmission = true;
        if (submission.submittedAt && submission.submittedAt !== "") {
          if (!latestSubmission || new Date(submission.submittedAt).getTime() > new Date(latestSubmission.submittedAt).getTime()) {
            latestSubmission = submission;
          }
        } else if (!latestSubmission) {
          latestSubmission = submission;
        }
        if (gradingSession) {
          if (!latestGradingSession || new Date(gradingSession.createdAt).getTime() > new Date(latestGradingSession.createdAt).getTime()) {
            latestGradingSession = gradingSession;
            latestReport = report;
          }
        } else if (!latestReport) {
          if (gradeItems.length > 0) {
            latestReport = report;
          }
        }
      }
      if (latestReport) {
        allGradeItems = latestReport.gradeItems;
        if (!latestGradingSession && latestReport.gradingSession) {
          latestGradingSession = latestReport.gradingSession;
        }
        if (!latestSubmission) {
          latestSubmission = latestReport.submission;
        }
      }
      const calculatedTotalScore = allGradeItems.reduce((sum, item) => sum + item.score, 0);
      const isGraded = allGradeItems.length > 0 || (latestGradingSession && latestGradingSession.status === 1);
      const totalScoreDisplay = isGraded
        ? (calculatedMaxScore > 0
            ? `${calculatedTotalScore.toFixed(2)}/${calculatedMaxScore.toFixed(2)}`
            : calculatedTotalScore > 0
              ? calculatedTotalScore.toFixed(2)
              : "0")
        : "Not graded";
      const submissionId = latestSubmission?.id || 0;
      const submittedAt = latestSubmission && latestSubmission.submittedAt && latestSubmission.submittedAt !== ""
        ? new Date(latestSubmission.submittedAt).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "N/A";
      if (questions.length > 0) {
        for (const question of questions) {
          const questionRubrics = rubrics[question.id] || [];
          if (questionRubrics.length === 0) {
            const questionText = `Q${question.questionNumber || question.id}: ${question.questionText}`;
            const criteriaKey = `${questionText}_N/A`;
            if (!criteriaMap.has(criteriaKey)) {
              criteriaMap.set(criteriaKey, {
                question: questionText,
                criteria: "N/A",
                score: 0,
                maxScore: 0,
                comments: "",
                submissionId,
                submittedAt,
                totalScore: totalScoreDisplay,
              });
            }
          } else {
            for (const rubric of questionRubrics) {
              const questionText = `Q${question.questionNumber || question.id}: ${question.questionText}`;
              const criteriaText = rubric.description || "N/A";
              const criteriaKey = `${questionText}_${criteriaText}`;
              const gradeItem = allGradeItems.find(
                (item) => item.rubricItemId === rubric.id
              );
              if (!criteriaMap.has(criteriaKey)) {
                criteriaMap.set(criteriaKey, {
                  question: questionText,
                  criteria: criteriaText,
                  score: gradeItem ? gradeItem.score : 0,
                  maxScore: rubric.score || 0,
                  comments: gradeItem?.comments || "",
                  submissionId,
                  submittedAt,
                  totalScore: totalScoreDisplay,
                });
              }
            }
          }
        }
      }
      if (criteriaMap.size === 0) {
        const criteriaKey = "N/A_N/A";
        criteriaMap.set(criteriaKey, {
          question: "N/A",
          criteria: "",
          score: 0,
          maxScore: 0,
          comments: "",
          submissionId,
          submittedAt,
          totalScore: totalScoreDisplay,
        });
      }
      for (const criteriaData of criteriaMap.values()) {
        exportData.push({
          "Student Code": isFirstStudentRow ? studentCode : "",
          "Student Name": isFirstStudentRow ? studentName : "",
          "Assignment Type": isFirstCourseElementRow ? assignmentType : "",
          "Course Element": isFirstCourseElementRow ? courseElementName : "",
          "Submission ID": isFirstCourseElementRow ? criteriaData.submissionId : "",
          "Submitted At": isFirstCourseElementRow ? criteriaData.submittedAt : "",
          "Total Score": isFirstCourseElementRow ? criteriaData.totalScore : "",
          "Question": criteriaData.question,
          "Criteria": criteriaData.criteria,
          "Score": criteriaData.score,
          "Max Score": criteriaData.maxScore,
          "Comments": criteriaData.comments,
        });
        isFirstStudentRow = false;
        isFirstCourseElementRow = false;
      }
    }
  }
  console.log("Total rows to export:", exportData.length);
  if (exportData.length === 0) {
    throw new Error("No data available to export");
  }
  console.log("Creating worksheet...");
  const ws = XLSX.utils.json_to_sheet(exportData);
  console.log("Worksheet created, range:", ws["!ref"]);
  const colWidths: { [key: string]: number } = {
    A: 15,
    B: 25,
    C: 15,
    D: 30,
    E: 12,
    F: 20,
    G: 15,
    H: 50,
    I: 30,
    J: 10,
    K: 10,
    L: 30,
  };
  ws["!cols"] = Object.keys(colWidths).map((col) => ({
    wch: colWidths[col],
  }));
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const textColumns = ["H", "I", "L"];
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (const col of textColumns) {
      const cellAddress = XLSX.utils.encode_cell({ c: col.charCodeAt(0) - 65, r: R });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        alignment: { wrapText: true, vertical: "top" },
      };
    }
  }
  for (let R = 0; R <= range.e.r; ++R) {
    if (!ws["!rows"]) ws["!rows"] = [];
    ws["!rows"][R] = { hpt: 30 };
  }
  XLSX.utils.book_append_sheet(wb, ws, "Grade Report");
  try {
    const finalFileName = `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`;
    console.log("Attempting to write file:", finalFileName);
    console.log("Workbook sheets:", wb.SheetNames);
    XLSX.writeFile(wb, finalFileName);
    console.log("File exported successfully:", finalFileName);
  } catch (error) {
    console.error("Error writing file:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to write Excel file: ${error instanceof Error ? error.message : String(error)}`);
  }
}