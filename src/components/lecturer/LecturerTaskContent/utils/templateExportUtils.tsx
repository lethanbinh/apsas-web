import type { AssessmentPaper } from "@/services/assessmentPaperService";
import type { AssessmentQuestion } from "@/services/assessmentQuestionService";
import type { AssessmentTemplate } from "@/services/assessmentTemplateService";
import type { RubricItem } from "@/services/rubricItemService";
import { rubricItemService } from "@/services/rubricItemService";
import type { NotificationInstance } from "antd/es/notification/interface";
import * as XLSX from "xlsx";

interface ExportTemplateParams {
  template: AssessmentTemplate | null;
  papers: AssessmentPaper[];
  allQuestions: { [paperId: number]: AssessmentQuestion[] };
  notification: NotificationInstance;
}

export async function exportTemplate({
  template,
  papers,
  allQuestions,
  notification,
}: ExportTemplateParams) {
  if (!template) return;

  if (typeof window === 'undefined') {
    notification.error({
      message: "Export Failed",
      description: "Export is only available in the browser.",
    });
    return;
  }

  try {
    let docxModule: any;
    let fileSaverModule: any;

    try {
      docxModule = await import("docx");
      fileSaverModule = await import("file-saver");
    } catch (importError) {
      console.error("Failed to import docx or file-saver:", importError);
      notification.error({
        message: "Export Failed",
        description: "Required libraries could not be loaded. Please refresh the page and try again.",
      });
      return;
    }

    const { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } = docxModule;
    const saveAs = fileSaverModule.default || fileSaverModule.saveAs;

    if (!Document || !Packer || !saveAs) {
      throw new Error("Required exports not found in imported modules");
    }

    const docSections = [];
    docSections.push(
      new Paragraph({
        text: template.name,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      })
    );
    docSections.push(
      new Paragraph({ text: template.description, style: "italic" })
    );
    docSections.push(new Paragraph({ text: " " }));

    for (const paper of papers) {
      docSections.push(
        new Paragraph({
          text: paper.name,
          heading: HeadingLevel.HEADING_1,
        })
      );
      docSections.push(new Paragraph({ text: paper.description }));
      docSections.push(new Paragraph({ text: " " }));

      const questions = allQuestions[paper.id] || [];
      for (const [index, question] of questions.entries()) {
        docSections.push(
          new Paragraph({
            text: `Question ${index + 1}: ${question.questionText}`,
            heading: HeadingLevel.HEADING_2,
          })
        );
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({ text: "Score: ", bold: true }),
              new TextRun(question.score.toString()),
            ],
          })
        );
        docSections.push(new Paragraph({ text: " " }));
        docSections.push(
          new Paragraph({
            children: [new TextRun({ text: "Sample Input: ", bold: true })],
          })
        );
        docSections.push(new Paragraph({ text: question.questionSampleInput }));
        docSections.push(new Paragraph({ text: " " }));
        docSections.push(
          new Paragraph({
            children: [new TextRun({ text: "Sample Output: ", bold: true })],
          })
        );
        docSections.push(
          new Paragraph({ text: question.questionSampleOutput })
        );
        docSections.push(new Paragraph({ text: " " }));
      }
    }

    const doc = new Document({
      sections: [{ properties: {}, children: docSections }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${template.name || "exam"}.docx`);
  } catch (err) {
    console.error("Error generating docx:", err);
    notification.error({
      message: "Export Failed",
      description: "Failed to export document. Please try again.",
    });
  }
}

export interface DownloadTemplateParams {
  template: AssessmentTemplate | null;
  task: any;
  lecturerId: number;
  papers: AssessmentPaper[];
  allQuestions: { [paperId: number]: AssessmentQuestion[] };
  notification: NotificationInstance;
}

export async function downloadTemplate({
  template,
  task,
  lecturerId,
  papers,
  allQuestions,
  notification,
}: DownloadTemplateParams) {
  const targetTemplate = template;


  const finalTemplate = targetTemplate || {
    id: 0,
    assignRequestId: task.id,
    templateType: 0,
    name: "Sample Template",
    description: "Sample template description",
    startupProject: "",
    createdByLecturerId: lecturerId,
    lecturerName: "",
    lecturerCode: "",
    assignedToHODId: task.assignedByHODId,
    hodName: "",
    hodCode: "",
    courseElementId: task.courseElementId || 0,
    courseElementName: "",
    createdAt: "",
    updatedAt: "",
    files: [],
    papers: [],
  };

  try {
    const wb = XLSX.utils.book_new();


    const templateData = [
      ["ASSESSMENT TEMPLATE"],
      ["Field", "Value", "Description"],
      ["Name", finalTemplate.name || "", "Template name"],
      ["Description", finalTemplate.description || "", "Template description"],
      ["Template Type", finalTemplate.templateType === 0 ? "DSA (0)" : "WEBAPI (1)", "0: DSA, 1: WEBAPI"],
      ["Startup Project", finalTemplate.startupProject || "", "Startup project (required for WEBAPI, leave empty for DSA)"],
      [],
      ["INSTRUCTIONS:"],
      ["1. Fill in the Name, Description, and Template Type fields above"],
      ...(finalTemplate.templateType === 1 ? [["2. Fill in the Startup Project field (required for WEBAPI templates)"]] : []),
      [finalTemplate.templateType === 1 ? "3" : "2", ". Use the Papers sheet to add papers"],
      [finalTemplate.templateType === 1 ? "4" : "3", ". Use the Questions sheet to add questions (reference papers by name)"],
      [finalTemplate.templateType === 1 ? "5" : "4", ". Use the Rubrics sheet to add rubrics (reference questions by question number)"],
    ];
    const templateWs = XLSX.utils.aoa_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, templateWs, "Assessment Template");


    let papersData: any[][];
    const targetPapers = (finalTemplate === template && template) ? papers : [];
    if (targetPapers.length > 0) {
      const papersMap = new Map<string, AssessmentPaper>();
      for (const paper of targetPapers) {
        const key = `${paper.name}|${paper.description || ""}|${paper.language || 0}`;
        if (!papersMap.has(key)) {
          papersMap.set(key, paper);
        }
      }
      const uniquePapers = Array.from(papersMap.values());

      papersData = [
        ["PAPERS"],
        ["Name", "Description", "Language", "Instructions"],
      ];
      for (const paper of uniquePapers) {
        const langStr = paper.language === 0 ? "CSharp" : paper.language === 1 ? "C" : paper.language === 2 ? "Java" : "CSharp";
        papersData.push([paper.name, paper.description || "", langStr, ""]);
      }
      papersData.push([]);
      papersData.push(["INSTRUCTIONS:"]);
      papersData.push(["- Name: Paper name (required)"]);
      papersData.push(["- Description: Paper description (optional)"]);
      papersData.push(["- Language: CSharp (0), C (1), or Java (2)"]);
      papersData.push(["- Reference papers by name in the Questions sheet"]);
    } else {
      papersData = [
        ["PAPERS"],
        ["Name", "Description", "Language", "Instructions"],
        ["Paper 1", "Description for Paper 1", "CSharp", "Language: CSharp (0), C (1), Java (2)"],
        [],
        ["INSTRUCTIONS:"],
        ["- Name: Paper name (required)"],
        ["- Description: Paper description (optional)"],
        ["- Language: CSharp (0), C (1), or Java (2)"],
        ["- Reference papers by name in the Questions sheet"],
      ];
    }
    const papersWs = XLSX.utils.aoa_to_sheet(papersData);
    XLSX.utils.book_append_sheet(wb, papersWs, "Papers");


    let questionsData: any[][];
    const targetAllQuestions = (template && finalTemplate === template) ? allQuestions : {};
    if (targetPapers.length > 0 && Object.keys(targetAllQuestions).length > 0) {
      const questionsMap = new Map<string, { paperName: string; question: AssessmentQuestion }>();
      for (const paper of targetPapers) {
        const questions = targetAllQuestions[paper.id] || [];
        for (const question of questions) {
          const key = `${paper.name}|${question.questionNumber || 0}|${question.questionText || ""}|${question.questionSampleInput || ""}|${question.questionSampleOutput || ""}|${question.score || 0}`;
          if (!questionsMap.has(key)) {
            questionsMap.set(key, { paperName: paper.name, question });
          }
        }
      }
      const uniqueQuestions = Array.from(questionsMap.values());

      questionsData = [
        ["QUESTIONS"],
        ["Paper Name", "Question Number", "Question Text", "Sample Input", "Sample Output", "Score", "Instructions"],
      ];
      for (const { paperName, question } of uniqueQuestions) {
        questionsData.push([
          paperName,
          question.questionNumber || 0,
          question.questionText || "",
          question.questionSampleInput || "",
          question.questionSampleOutput || "",
          question.score || 0,
          "",
        ]);
      }
      questionsData.push([]);
      questionsData.push(["INSTRUCTIONS:"]);
      questionsData.push(["- Paper Name: Must match a paper name from the Papers sheet (required)"]);
      questionsData.push(["- Question Number: Sequential number for questions in the same paper (required)"]);
      questionsData.push(["- Question Text: The question description (required)"]);
      questionsData.push(["- Sample Input: Example input for testing (optional)"]);
      questionsData.push(["- Sample Output: Expected output for the sample input (optional)"]);
      questionsData.push(["- Score: Maximum score for this question (required)"]);
      questionsData.push(["- Reference questions by Question Number in the Rubrics sheet"]);
    } else {
      questionsData = [
        ["QUESTIONS"],
        ["Paper Name", "Question Number", "Question Text", "Sample Input", "Sample Output", "Score", "Instructions"],
        ["Paper 1", 1, "Write a function to calculate factorial", "5", "120", 10, "Paper Name must match a paper from Papers sheet"],
        ["Paper 1", 2, "Write a function to check if a number is prime", "7", "true", 10, ""],
        ["Paper 1", 3, "Write a function to reverse a string", "\"hello\"", "\"olleh\"", 10, ""],
        ["Paper 1", 4, "Write a function to find the maximum in an array", "[1, 5, 3, 9, 2]", "9", 10, ""],
        [],
        ["INSTRUCTIONS:"],
        ["- Paper Name: Must match a paper name from the Papers sheet (required)"],
        ["- Question Number: Sequential number for questions in the same paper (required)"],
        ["- Question Text: The question description (required)"],
        ["- Sample Input: Example input for testing (optional)"],
        ["- Sample Output: Expected output for the sample input (optional)"],
        ["- Score: Maximum score for this question (required)"],
        ["- Reference questions by Question Number in the Rubrics sheet"],
      ];
    }
    const questionsWs = XLSX.utils.aoa_to_sheet(questionsData);
    XLSX.utils.book_append_sheet(wb, questionsWs, "Questions");


    let rubricsData: any[][];
    if (targetPapers.length > 0 && Object.keys(targetAllQuestions).length > 0) {
      const allRubrics: Array<{ paperName: string; questionNumber: number; rubric: RubricItem }> = [];
      for (const paper of targetPapers) {
        const questions = targetAllQuestions[paper.id] || [];
        for (const question of questions) {
          try {
            const rubricsResponse = await rubricItemService.getRubricsForQuestion({
              assessmentQuestionId: question.id,
              pageNumber: 1,
              pageSize: 100,
            });
            for (const rubric of rubricsResponse.items) {
              allRubrics.push({
                paperName: paper.name,
                questionNumber: question.questionNumber || 0,
                rubric,
              });
            }
          } catch (error) {
            console.error(`Failed to fetch rubrics for question ${question.id}:`, error);
          }
        }
      }

      const rubricsMap = new Map<string, { paperName: string; questionNumber: number; rubric: RubricItem }>();
      for (const item of allRubrics) {
        const key = `${item.paperName}|${item.questionNumber}|${item.rubric.description || ""}|${item.rubric.input || ""}|${item.rubric.output || ""}|${item.rubric.score || 0}`;
        if (!rubricsMap.has(key)) {
          rubricsMap.set(key, item);
        }
      }
      const uniqueRubrics = Array.from(rubricsMap.values());

      rubricsData = [
        ["RUBRICS"],
        ["Paper Name", "Question Number", "Description", "Input", "Output", "Score", "Instructions"],
      ];
      for (const { paperName, questionNumber, rubric } of uniqueRubrics) {
        rubricsData.push([
          paperName,
          questionNumber,
          rubric.description || "",
          rubric.input || "",
          rubric.output || "",
          rubric.score || 0,
          "",
        ]);
      }
      rubricsData.push([]);
      rubricsData.push(["INSTRUCTIONS:"]);
      rubricsData.push(["- Paper Name: Must match a paper name from the Papers sheet (required)"]);
      rubricsData.push(["- Question Number: Must match a question number from the Questions sheet (required)"]);
      rubricsData.push(["- Description: Rubric description (required)"]);
      rubricsData.push(["- Input: Test input for this rubric (optional)"]);
      rubricsData.push(["- Output: Expected output for this input (optional)"]);
      rubricsData.push(["- Score: Points for this rubric (required)"]);
    } else {
      rubricsData = [
        ["RUBRICS"],
        ["Paper Name", "Question Number", "Description", "Input", "Output", "Score", "Instructions"],
        ["Paper 1", 1, "Correct input/output format", "5", "120", 5, "Paper Name and Question Number must match from Questions sheet"],
        ["Paper 1", 2, "Correct prime number check", "7", "true", 5, ""],
        ["Paper 1", 3, "Correct string reversal", "\"hello\"", "\"olleh\"", 5, ""],
        ["Paper 1", 4, "Correct maximum finding", "[1, 5, 3, 9, 2]", "9", 5, ""],
        [],
        ["INSTRUCTIONS:"],
        ["- Paper Name: Must match a paper name from the Papers sheet (required)"],
        ["- Question Number: Must match a question number from the Questions sheet (required)"],
        ["- Description: Rubric description (required)"],
        ["- Input: Test input for this rubric (optional)"],
        ["- Output: Expected output for this input (optional)"],
        ["- Score: Points for this rubric (required)"],
      ];
    }
    const rubricsWs = XLSX.utils.aoa_to_sheet(rubricsData);
    XLSX.utils.book_append_sheet(wb, rubricsWs, "Rubrics");


    const setColumnWidths = (ws: XLSX.WorkSheet, widths: { [key: string]: number }) => {
      ws["!cols"] = Object.keys(widths).map((col) => ({ wch: widths[col] || 15 }));
    };

    setColumnWidths(templateWs, { A: 20, B: 30, C: 40 });
    setColumnWidths(papersWs, { A: 20, B: 30, C: 15, D: 40 });
    setColumnWidths(questionsWs, { A: 20, B: 15, C: 40, D: 20, E: 20, F: 10, G: 40 });
    setColumnWidths(rubricsWs, { A: 20, B: 15, C: 30, D: 20, E: 20, F: 10, G: 40 });

    const fileName = `Assessment_Template_Import_${finalTemplate.name || "Template"}_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    notification.success({
      message: "Template Downloaded",
      description: "Excel template has been downloaded successfully.",
    });
  } catch (error: any) {
    console.error("Failed to download template:", error);
    notification.error({
      message: "Download Failed",
      description: error.message || "Failed to download template. Please try again.",
    });
    throw error;
  }
}

