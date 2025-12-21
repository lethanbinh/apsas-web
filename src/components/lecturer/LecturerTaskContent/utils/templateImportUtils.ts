import * as XLSX from "xlsx";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import { rubricItemService } from "@/services/rubricItemService";
import { assignRequestService } from "@/services/assignRequestService";
import type { AssessmentTemplate } from "@/services/assessmentTemplateService";
import type { AssessmentPaper } from "@/services/assessmentPaperService";
import type { AssessmentQuestion } from "@/services/assessmentQuestionService";
import type { AssignRequestItem } from "@/services/assignRequestService";
import type { NotificationInstance } from "antd/es/notification/interface";

interface ImportTemplateParams {
  file: File;
  existingTemplate: AssessmentTemplate | null | undefined;
  task: AssignRequestItem;
  lecturerId: number;
  templates: AssessmentTemplate[];
  isRejected: boolean;
  notification: NotificationInstance;
  refetchTemplates: () => Promise<any>;
  fetchAllData: (templateId: number) => Promise<void>;
  resetStatusIfRejected: () => Promise<void>;
  updateStatusToInProgress?: () => Promise<void>;
}

export async function importTemplate({
  file,
  existingTemplate,
  task,
  lecturerId,
  templates,
  isRejected,
  notification,
  refetchTemplates,
  fetchAllData,
  resetStatusIfRejected,
  updateStatusToInProgress,
}: ImportTemplateParams) {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });


    const templateSheet = workbook.Sheets["Assessment Template"];
    if (!templateSheet) {
      throw new Error("Assessment Template sheet not found");
    }
    const templateRows = XLSX.utils.sheet_to_json(templateSheet, { header: 1 }) as any[][];


    let templateName = "";
    let templateDesc = "";
    let templateType = 0;
    let startupProject = "";

    for (let i = 2; i < templateRows.length; i++) {
      const row = templateRows[i];
      if (row && row[0]) {
        const fieldName = String(row[0]).trim();
        if (fieldName === "Name" && row[1]) {
          templateName = String(row[1]).trim();
        } else if (fieldName === "Description" && row[1]) {
          templateDesc = String(row[1]).trim();
        } else if (fieldName === "Template Type" && row[1]) {
          const typeStr = String(row[1]);
          if (typeStr.includes("0")) templateType = 0;
          else if (typeStr.includes("1")) templateType = 1;
          else {
            templateType = 0;
            notification.warning({
              message: "Invalid Template Type",
              description: `Template type "${typeStr}" is not valid. Only 0 (DSA) and 1 (WEBAPI) are accepted. Defaulting to 0 (DSA).`,
            });
          }
        } else if (fieldName === "Startup Project" && row[1]) {
          startupProject = String(row[1]).trim();
        }
      }
    }


    if (!templateName) {
      throw new Error("Template name is required in the Assessment Template sheet");
    }


    if (templateType === 1 && !startupProject) {
      throw new Error("Startup Project is required for WEBAPI templates in the Assessment Template sheet");
    }


    let currentTemplate: AssessmentTemplate;
    if (existingTemplate) {
      const existingStartupProject = existingTemplate.startupProject || "";
      if (templateName !== existingTemplate.name || templateDesc !== existingTemplate.description || templateType !== existingTemplate.templateType || (templateType === 1 && startupProject !== existingStartupProject)) {
        currentTemplate = await assessmentTemplateService.updateAssessmentTemplate(existingTemplate.id, {
          name: templateName,
          description: templateDesc,
          templateType: templateType,
          startupProject: templateType === 1 ? startupProject : undefined,
          assignedToHODId: existingTemplate.assignedToHODId,
        });
      } else {
        currentTemplate = existingTemplate;
      }
    } else {
      if (templates.length > 0 && !isRejected) {
        throw new Error("Template already exists. Please delete existing template first or import will update it.");
      }

      currentTemplate = await assessmentTemplateService.createAssessmentTemplate({
        name: templateName,
        description: templateDesc,
        templateType: templateType,
        startupProject: templateType === 1 ? startupProject : undefined,
        assignRequestId: task.id,
        createdByLecturerId: lecturerId,
        assignedToHODId: task.assignedByHODId,
      });

      // When rejected and importing, updateStatusToInProgress will be called after resetStatusIfRejected
      // So we don't need to manually update status here
    }


    const papersSheet = workbook.Sheets["Papers"];
    if (!papersSheet) {
      throw new Error("Papers sheet not found");
    }
    const papersRows = XLSX.utils.sheet_to_json(papersSheet, { header: 1 }) as any[][];

    const paperDataMap = new Map<string, { name: string; description: string; language: number }>();
    for (let i = 2; i < papersRows.length; i++) {
      const row = papersRows[i];
      if (row && row[0]) {
        const firstCell = String(row[0]).trim();
        // Skip Instructions rows and empty rows
        if (firstCell && 
            !firstCell.toUpperCase().startsWith("INSTRUCTIONS") && 
            !firstCell.startsWith("-") &&
            firstCell.toUpperCase() !== "PAPERS") {
          const name = firstCell;
          const description = row[1] ? String(row[1]).trim() : "";
          let language = 0;
          if (row[2]) {
            const langStr = String(row[2]).toLowerCase();
            if (langStr.includes("c") && !langStr.includes("sharp")) language = 1;
            else if (langStr.includes("java")) language = 2;
          }
          const paperKey = `${name}|${description}|${language}`;
          if (!paperDataMap.has(paperKey)) {
            paperDataMap.set(paperKey, { name, description, language });
          }
        }
      }
    }
    const paperData = Array.from(paperDataMap.values());


    const questionsSheet = workbook.Sheets["Questions"];
    if (!questionsSheet) {
      throw new Error("Questions sheet not found");
    }
    const questionsRows = XLSX.utils.sheet_to_json(questionsSheet, { header: 1 }) as any[][];

    const questionDataMap = new Map<string, {
      paperName: string;
      questionNumber: number;
      questionText: string;
      sampleInput: string;
      sampleOutput: string;
      score: number;
    }>();
    for (let i = 2; i < questionsRows.length; i++) {
      const row = questionsRows[i];
      if (row && row[0]) {
        const firstCell = String(row[0]).trim();
        // Skip Instructions rows and empty rows
        if (firstCell && 
            !firstCell.toUpperCase().startsWith("INSTRUCTIONS") && 
            !firstCell.startsWith("-") &&
            firstCell.toUpperCase() !== "QUESTIONS") {
          const paperName = firstCell;
          const questionNumber = row[1] ? Number(row[1]) : 0;
          const questionText = row[2] ? String(row[2]).trim() : "";
          const sampleInput = row[3] ? String(row[3]).trim() : "";
          const sampleOutput = row[4] ? String(row[4]).trim() : "";
          const score = row[5] ? Number(row[5]) : 0;
          if (paperName && questionNumber > 0 && questionText) {
            const questionKey = `${paperName}|${questionNumber}|${questionText}|${sampleInput}|${sampleOutput}|${score}`;
            if (!questionDataMap.has(questionKey)) {
              questionDataMap.set(questionKey, { paperName, questionNumber, questionText, sampleInput, sampleOutput, score });
            }
          }
        }
      }
    }
    const questionData = Array.from(questionDataMap.values());


    const rubricsSheet = workbook.Sheets["Rubrics"];
    if (!rubricsSheet) {
      throw new Error("Rubrics sheet not found");
    }
    const rubricsRows = XLSX.utils.sheet_to_json(rubricsSheet, { header: 1 }) as any[][];

    const rubricDataMap = new Map<string, {
      paperName: string;
      questionNumber: number;
      description: string;
      input: string;
      output: string;
      score: number;
    }>();
    for (let i = 2; i < rubricsRows.length; i++) {
      const row = rubricsRows[i];
      if (row && row[0]) {
        const firstCell = String(row[0]).trim();
        // Skip Instructions rows and empty rows
        if (firstCell && 
            !firstCell.toUpperCase().startsWith("INSTRUCTIONS") && 
            !firstCell.startsWith("-") &&
            firstCell.toUpperCase() !== "RUBRICS") {
          const paperName = firstCell;
          const questionNumber = row[1] ? Number(row[1]) : 0;
          const description = row[2] ? String(row[2]).trim() : "";
          const input = row[3] ? String(row[3]).trim() : "";
          const output = row[4] ? String(row[4]).trim() : "";
          const score = row[5] ? Number(row[5]) : 0;
          if (paperName && questionNumber > 0 && description) {
            const rubricKey = `${paperName}|${questionNumber}|${description}|${input}|${output}|${score}`;
            if (!rubricDataMap.has(rubricKey)) {
              rubricDataMap.set(rubricKey, { paperName, questionNumber, description, input, output, score });
            }
          }
        }
      }
    }
    const rubricData = Array.from(rubricDataMap.values());

    const createdPapers = new Map<string, AssessmentPaper>();
    for (const paper of paperData) {
      try {
        const paperKey = `${paper.name}|${paper.description}|${paper.language}`;
        if (createdPapers.has(paperKey)) {
          continue;
        }
        const createdPaper = await assessmentPaperService.createAssessmentPaper({
          name: paper.name,
          description: paper.description,
          assessmentTemplateId: currentTemplate.id,
          language: paper.language,
        });
        createdPapers.set(paperKey, createdPaper);
        if (!createdPapers.has(paper.name)) {
          createdPapers.set(paper.name, createdPaper);
        }
      } catch (error: any) {
        console.error(`Failed to create paper ${paper.name}:`, error);
        notification.warning({
          message: `Failed to create paper: ${paper.name}`,
          description: error.message || "Unknown error",
        });
      }
    }


    const questionsByPaper = new Map<string, typeof questionData>();
    for (const question of questionData) {
      if (!questionsByPaper.has(question.paperName)) {
        questionsByPaper.set(question.paperName, []);
      }
      questionsByPaper.get(question.paperName)!.push(question);
    }

    const createdQuestions = new Map<string, AssessmentQuestion>();
    for (const [paperName, questions] of questionsByPaper.entries()) {
      const paper = createdPapers.get(paperName);
      if (!paper) {
        notification.warning({
          message: `Paper not found: ${paperName}`,
          description: `Questions for this paper will be skipped.`,
        });
        continue;
      }

      for (const question of questions) {
        try {
          const createdQuestion = await assessmentQuestionService.createAssessmentQuestion({
            questionText: question.questionText,
            questionSampleInput: question.sampleInput,
            questionSampleOutput: question.sampleOutput,
            score: question.score,
            questionNumber: question.questionNumber,
            assessmentPaperId: paper.id,
          });
          createdQuestions.set(`${paperName}-${question.questionNumber}`, createdQuestion);
        } catch (error: any) {
          console.error(`Failed to create question ${question.questionNumber} for paper ${paperName}:`, error);
          notification.warning({
            message: `Failed to create question ${question.questionNumber}`,
            description: error.message || "Unknown error",
          });
        }
      }
    }


    for (const rubric of rubricData) {
      const questionKey = `${rubric.paperName}-${rubric.questionNumber}`;
      const foundQuestion = createdQuestions.get(questionKey);

      if (!foundQuestion) {
        notification.warning({
          message: `Question not found`,
          description: `Question ${rubric.questionNumber} in paper "${rubric.paperName}" not found. Rubric "${rubric.description}" will be skipped.`,
        });
        continue;
      }

      try {
        await rubricItemService.createRubricItem({
          description: rubric.description,
          input: rubric.input,
          output: rubric.output,
          score: rubric.score,
          assessmentQuestionId: foundQuestion.id,
        });
      } catch (error: any) {
        console.error(`Failed to create rubric for question ${rubric.questionNumber}:`, error);
        notification.warning({
          message: `Failed to create rubric`,
          description: error.message || "Unknown error",
        });
      }
    }

    await refetchTemplates();
    await fetchAllData(currentTemplate.id);
    await resetStatusIfRejected();
    
    // Update status to IN_PROGRESS after import (unless already rejected and will be reset)
    if (updateStatusToInProgress && !isRejected) {
      await updateStatusToInProgress();
    }

    notification.success({
      message: "Import Successful",
      description: `Imported template "${templateName}" with ${paperData.length} papers, ${questionData.length} questions, and ${rubricData.length} rubrics.`,
    });
  } catch (error: any) {
    console.error("Failed to import template:", error);
    notification.error({
      message: "Import Failed",
      description: error.message || "Failed to import template. Please check the file format.",
    });
  }
}

