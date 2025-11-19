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

// Helper function to determine assignment type from course element name
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

  // Group by student first - use studentId as key to avoid issues with empty names or special characters
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

  // Generate report for each student
  for (const [studentId, studentData] of studentMap.entries()) {
    const { studentCode, studentName, reports: studentReports } = studentData;
    let isFirstStudentRow = true; // Track first row for this student

    // Group by course element (môn) for this student
    const courseElementMap = new Map<string, GradeReportData[]>();
    for (const report of studentReports) {
      const courseElementName = report.courseElementName || "N/A";
      if (!courseElementMap.has(courseElementName)) {
        courseElementMap.set(courseElementName, []);
      }
      courseElementMap.get(courseElementName)!.push(report);
    }

    // Process each course element for this student
    for (const [courseElementName, courseElementReports] of courseElementMap.entries()) {
      let isFirstCourseElementRow = true; // Track first row for this course element
      // Determine assignment type from course element name (not from field)
      const assignmentType = getAssignmentTypeFromName(courseElementName);

      // Group by criteria (tiêu chí) to avoid duplicates
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

      // Get questions and rubrics from first report (they should be the same for all submissions of same course element)
      const firstReport = courseElementReports[0];
      const { questions, rubrics } = firstReport;
      
      // Calculate max score from all rubrics (for all questions)
      let calculatedMaxScore = 0;
      if (questions.length > 0) {
        for (const question of questions) {
          const questionRubrics = rubrics[question.id] || [];
          calculatedMaxScore += questionRubrics.reduce((sum, rubric) => sum + (rubric.score || 0), 0);
        }
      }

      // Process all submissions for this course element
      // Find the latest submission with grading session to get the most recent gradeItems
      let latestSubmission: Submission | null = null;
      let allGradeItems: GradeItem[] = [];
      let latestGradingSession: GradingSession | null = null;
      let latestReport: GradeReportData | null = null;
      let hasSubmission = false;

      // Find the report with the latest grading session (most recent grading)
      for (const report of courseElementReports) {
        const { submission, gradeItems, gradingSession } = report;
        hasSubmission = true;
        
        // Keep track of latest submission (only if submission has valid submittedAt)
        if (submission.submittedAt && submission.submittedAt !== "") {
          if (!latestSubmission || new Date(submission.submittedAt).getTime() > new Date(latestSubmission.submittedAt).getTime()) {
            latestSubmission = submission;
          }
        } else if (!latestSubmission) {
          // Use first submission even if no submittedAt
          latestSubmission = submission;
        }
        
        // Find the report with the latest grading session
        if (gradingSession) {
          if (!latestGradingSession || new Date(gradingSession.createdAt).getTime() > new Date(latestGradingSession.createdAt).getTime()) {
            latestGradingSession = gradingSession;
            latestReport = report;
          }
        } else if (!latestReport) {
          // If no grading session, use first report with gradeItems
          if (gradeItems.length > 0) {
            latestReport = report;
          }
        }
      }

      // Use gradeItems from the latest grading session (or latest report with gradeItems)
      // This ensures we don't duplicate gradeItems from multiple submissions
      if (latestReport) {
        allGradeItems = latestReport.gradeItems;
        if (!latestGradingSession && latestReport.gradingSession) {
          latestGradingSession = latestReport.gradingSession;
        }
        if (!latestSubmission) {
          latestSubmission = latestReport.submission;
        }
      }

      // Calculate total score from gradeItems (only from latest grading session, no duplicates)
      const calculatedTotalScore = allGradeItems.reduce((sum, item) => sum + item.score, 0);

      // Determine if graded: has gradeItems OR has completed grading session
      const isGraded = allGradeItems.length > 0 || (latestGradingSession && latestGradingSession.status === 1);
      
      // Format total score - only show "Not graded" if truly not graded
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

      // Process all questions and rubrics - export ALL criteria, even if no score (set to 0)
      // Always export at least one row, even if no questions or no criteria
      if (questions.length > 0) {
        for (const question of questions) {
          const questionRubrics = rubrics[question.id] || [];
          
          // If no rubrics for this question, add one row
          if (questionRubrics.length === 0) {
            const questionText = `Q${question.questionNumber || question.id}: ${question.questionText}`;
            const criteriaKey = `${questionText}_N/A`;
            if (!criteriaMap.has(criteriaKey)) {
              criteriaMap.set(criteriaKey, {
                question: questionText,
                criteria: "N/A",
                score: 0, // Set to 0 instead of "No scores available"
                maxScore: 0,
                comments: "",
                submissionId,
                submittedAt,
                totalScore: totalScoreDisplay,
              });
            }
          } else {
            // Process each rubric - export ALL rubrics, even if no gradeItem (set score to 0)
            for (const rubric of questionRubrics) {
              const questionText = `Q${question.questionNumber || question.id}: ${question.questionText}`;
              const criteriaText = rubric.description || "N/A";
              const criteriaKey = `${questionText}_${criteriaText}`;

              // Find grade item for this rubric
              const gradeItem = allGradeItems.find(
                (item) => item.rubricItemId === rubric.id
              );

              // Only add if not already exists (group by criteria)
              if (!criteriaMap.has(criteriaKey)) {
                criteriaMap.set(criteriaKey, {
                  question: questionText,
                  criteria: criteriaText,
                  score: gradeItem ? gradeItem.score : 0, // Set to 0 if no gradeItem
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
      
      // Always add at least one row for this course element, even if no questions or no criteria
      // This ensures ALL students are exported, even without submissions or questions
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

      // Add rows for this course element (grouped by criteria)
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

  // Check if we have data to export
  console.log("Total rows to export:", exportData.length);
  if (exportData.length === 0) {
    throw new Error("No data available to export");
  }

  // Create worksheet
  console.log("Creating worksheet...");
  const ws = XLSX.utils.json_to_sheet(exportData);
  console.log("Worksheet created, range:", ws["!ref"]);

  // Set column widths
  const colWidths: { [key: string]: number } = {
    A: 15, // Student Code
    B: 25, // Student Name
    C: 15, // Assignment Type
    D: 30, // Course Element
    E: 12, // Submission ID
    F: 20, // Submitted At
    G: 15, // Total Score
    H: 50, // Question
    I: 30, // Criteria
    J: 10, // Score
    K: 10, // Max Score
    L: 30, // Comments
  };

  ws["!cols"] = Object.keys(colWidths).map((col) => ({
    wch: colWidths[col],
  }));

  // Apply wrap text to text-heavy columns
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const textColumns = ["H", "I", "L"]; // Question, Criteria, Comments
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (const col of textColumns) {
      const cellAddress = XLSX.utils.encode_cell({ c: col.charCodeAt(0) - 65, r: R });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        alignment: { wrapText: true, vertical: "top" },
      };
    }
  }

  // Set row heights
  for (let R = 0; R <= range.e.r; ++R) {
    if (!ws["!rows"]) ws["!rows"] = [];
    ws["!rows"][R] = { hpt: 30 };
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Grade Report");

  // Write file
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
