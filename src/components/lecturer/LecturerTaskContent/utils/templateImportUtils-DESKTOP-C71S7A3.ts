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
}: ImportTemplateParams) {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });

    // ============================================
    // STEP 1: Read and parse Assessment Template sheet
    // ============================================
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

    // ============================================
    // STEP 2: Create or Update Template (FIRST)
    // ============================================
    let currentTemplate: AssessmentTemplate;
    if (existingTemplate) {
      // Update existing template
      const existingStartupProject = existingTemplate.startupProject || "";
      if (
        templateName !== existingTemplate.name || 
        templateDesc !== existingTemplate.description || 
        templateType !== existingTemplate.templateType || 
        (templateType === 1 && startupProject !== existingStartupProject)
      ) {
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
      // Check if template already exists (refetch to get latest data)
      await refetchTemplates();
      const freshTemplatesResponse = await assessmentTemplateService.getAssessmentTemplates({
        lecturerId: lecturerId,
        pageNumber: 1,
        pageSize: 1000,
      });
      const freshTemplates = freshTemplatesResponse.items.filter((t) => t.courseElementId === task.courseElementId);
      
      if (freshTemplates.length > 0 && !isRejected) {
        throw new Error("Template already exists. Please delete existing template first or import will update it.");
      }
      
      // Create new template
      currentTemplate = await assessmentTemplateService.createAssessmentTemplate({
        name: templateName,
        description: templateDesc,
        templateType: templateType,
        startupProject: templateType === 1 ? startupProject : undefined,
        assignRequestId: task.id,
        createdByLecturerId: lecturerId,
        assignedToHODId: task.assignedByHODId,
      });

      // Reset status if rejected
      if (isRejected) {
        try {
          await assignRequestService.updateAssignRequest(task.id, {
            message: task.message || "Template imported and resubmitted after rejection",
            courseElementId: task.courseElementId,
            assignedLecturerId: task.assignedLecturerId,
            assignedByHODId: task.assignedByHODId,
            status: 1,
            assignedAt: task.assignedAt,
          });
        } catch (err: any) {
          console.error("Failed to reset status:", err);
        }
      }
    }

    // ============================================
    // STEP 3: Read and parse Papers sheet
    // ============================================
    const papersSheet = workbook.Sheets["Papers"];
    if (!papersSheet) {
      throw new Error("Papers sheet not found");
    }
    const papersRows = XLSX.utils.sheet_to_json(papersSheet, { header: 1 }) as any[][];
    
    const paperDataMap = new Map<string, { name: string; description: string; language: number }>();
    let foundInstructions = false;
    
    for (let i = 2; i < papersRows.length; i++) {
      const row = papersRows[i];
      if (!row || !row[0]) continue; // Skip empty rows
      
      const firstCell = String(row[0]).trim();
      
      // Stop reading when we hit "INSTRUCTIONS:" section
      if (firstCell.startsWith("INSTRUCTIONS")) {
        foundInstructions = true;
        break;
      }
      
      // Skip instruction rows that start with "- " (these are instruction lines)
      if (firstCell.startsWith("- ")) {
        continue;
      }
      
      // Skip header row if it appears again
      if (firstCell.toLowerCase() === "name" || firstCell === "PAPERS") {
        continue;
      }
      
      // Skip if any cell contains instruction keywords
      const allCells = row.map(cell => String(cell || "").toLowerCase().trim()).join(" ");
      if (
        allCells.includes("instruction") ||
        allCells.includes("required") ||
        allCells.includes("optional") ||
        allCells.includes("reference papers")
      ) {
        continue;
      }
      
      const name = firstCell;
      const description = row[1] ? String(row[1]).trim() : "";
      let language = 0;
      
      if (row[2]) {
        const langStr = String(row[2]).toLowerCase().trim();
        // Skip if it's an instruction text in the language column
        if (
          langStr.includes("language:") || 
          langStr.includes("instructions") ||
          langStr.includes("reference") ||
          langStr.startsWith("-") ||
          langStr.includes("csharp (0)") ||
          langStr.includes("c (1)") ||
          langStr.includes("java (2)")
        ) {
          continue;
        }
        if (langStr.includes("c") && !langStr.includes("sharp")) language = 1;
        else if (langStr.includes("java")) language = 2;
      }
      
      // Final validation: ensure this looks like real data
      // Paper name should be a reasonable length and not contain instruction patterns
      if (
        name && 
        name.length > 0 && 
        name.length < 200 && // Reasonable length
        !name.startsWith("-") &&
        !name.toLowerCase().includes("instruction") &&
        !name.toLowerCase().includes("required") &&
        !name.toLowerCase().includes("optional") &&
        !name.toLowerCase().includes("name:") &&
        !name.toLowerCase().includes("description:") &&
        !name.toLowerCase().includes("language:")
      ) {
        const paperKey = `${name}|${description}|${language}`;
        if (!paperDataMap.has(paperKey)) {
          paperDataMap.set(paperKey, { name, description, language });
        }
      }
    }
    const paperData = Array.from(paperDataMap.values());

    // ============================================
    // STEP 4: Read and parse Questions sheet
    // ============================================
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
      if (!row || !row[0]) continue; // Skip empty rows
      
      const firstCell = String(row[0]).trim();
      
      // Stop reading when we hit "INSTRUCTIONS:" section
      if (firstCell.startsWith("INSTRUCTIONS")) {
        break;
      }
      
      // Skip instruction rows that start with "- "
      if (firstCell.startsWith("- ") || firstCell === "") {
        continue;
      }
      
      // Skip header row if it appears again
      if (firstCell.toLowerCase() === "paper name" || firstCell === "QUESTIONS") {
        continue;
      }
      
      const paperName = firstCell;
      const questionNumber = row[1] ? Number(row[1]) : 0;
      const questionText = row[2] ? String(row[2]).trim() : "";
      const sampleInput = row[3] ? String(row[3]).trim() : "";
      const sampleOutput = row[4] ? String(row[4]).trim() : "";
      const score = row[5] ? Number(row[5]) : 0;
      
      // Validate that this is actual data (not instructions)
      if (
        paperName && 
        !paperName.startsWith("-") && 
        !paperName.toLowerCase().includes("instruction") &&
        !paperName.toLowerCase().includes("required") &&
        !paperName.toLowerCase().includes("optional") &&
        questionNumber > 0 && 
        questionText && 
        questionText.length > 0 &&
        !questionText.toLowerCase().includes("instruction")
      ) {
        const questionKey = `${paperName}|${questionNumber}|${questionText}|${sampleInput}|${sampleOutput}|${score}`;
        if (!questionDataMap.has(questionKey)) {
          questionDataMap.set(questionKey, { paperName, questionNumber, questionText, sampleInput, sampleOutput, score });
        }
      }
    }
    const questionData = Array.from(questionDataMap.values());

    // ============================================
    // STEP 5: Read and parse Rubrics sheet
    // ============================================
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
      if (!row || !row[0]) continue; // Skip empty rows
      
      const firstCell = String(row[0]).trim();
      
      // Stop reading when we hit "INSTRUCTIONS:" section
      if (firstCell.startsWith("INSTRUCTIONS")) {
        break;
      }
      
      // Skip instruction rows that start with "- "
      if (firstCell.startsWith("- ") || firstCell === "") {
        continue;
      }
      
      // Skip header row if it appears again
      if (firstCell.toLowerCase() === "paper name" || firstCell === "RUBRICS") {
        continue;
      }
      
      const paperName = firstCell;
      const questionNumber = row[1] ? Number(row[1]) : 0;
      const description = row[2] ? String(row[2]).trim() : "";
      const input = row[3] ? String(row[3]).trim() : "";
      const output = row[4] ? String(row[4]).trim() : "";
      const score = row[5] ? Number(row[5]) : 0;
      
      // Validate that this is actual data (not instructions)
      if (
        paperName && 
        !paperName.startsWith("-") && 
        !paperName.toLowerCase().includes("instruction") &&
        !paperName.toLowerCase().includes("required") &&
        !paperName.toLowerCase().includes("optional") &&
        questionNumber > 0 && 
        description && 
        description.length > 0 &&
        !description.toLowerCase().includes("instruction") &&
        !description.toLowerCase().includes("required") &&
        !description.toLowerCase().includes("optional")
      ) {
        const rubricKey = `${paperName}|${questionNumber}|${description}|${input}|${output}|${score}`;
        if (!rubricDataMap.has(rubricKey)) {
          rubricDataMap.set(rubricKey, { paperName, questionNumber, description, input, output, score });
        }
      }
    }
    const rubricData = Array.from(rubricDataMap.values());

    // ============================================
    // STEP 6: Delete existing papers if updating template (BEFORE creating new ones)
    // ============================================
    if (existingTemplate) {
      try {
        // Fetch existing papers for this template
        const existingPapersResponse = await assessmentPaperService.getAssessmentPapers({
          assessmentTemplateId: currentTemplate.id,
          pageNumber: 1,
          pageSize: 1000,
        });
        
        // Delete all existing papers (this will cascade delete questions and rubrics)
        for (const existingPaper of existingPapersResponse.items) {
          try {
            await assessmentPaperService.deleteAssessmentPaper(existingPaper.id);
          } catch (error: any) {
            console.error(`Failed to delete existing paper ${existingPaper.name}:`, error);
            // Continue deleting other papers even if one fails
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch/delete existing papers:", error);
        // Continue with import even if deletion fails
      }
    }

    // ============================================
    // STEP 7: Create Papers (SECOND - after template)
    // ============================================
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
        // Store by full key (name|description|language) for deduplication
        createdPapers.set(paperKey, createdPaper);
        // Also store by name for easy lookup (only if not already set to avoid overwriting)
        if (!createdPapers.has(paper.name)) {
          createdPapers.set(paper.name, createdPaper);
        } else {
          // If duplicate name exists, warn but continue
          console.warn(`Duplicate paper name "${paper.name}" detected. Using first created paper.`);
        }
      } catch (error: any) {
        console.error(`Failed to create paper ${paper.name}:`, error);
        notification.warning({
          message: `Failed to create paper: ${paper.name}`,
          description: error.message || "Unknown error",
        });
      }
    }

    // ============================================
    // STEP 8: Create Questions (THIRD - after papers, sorted by questionNumber)
    // ============================================
    // Group questions by paper
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

      // Sort questions by questionNumber before creating (maintain order like manual creation)
      const sortedQuestions = [...questions].sort((a, b) => a.questionNumber - b.questionNumber);

      // Create questions in order
      for (const question of sortedQuestions) {
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

    // ============================================
    // STEP 9: Create Rubrics (FOURTH - after all questions, grouped by question)
    // ============================================
    // Group rubrics by question
    const rubricsByQuestion = new Map<string, typeof rubricData>();
    for (const rubric of rubricData) {
      const questionKey = `${rubric.paperName}-${rubric.questionNumber}`;
      if (!rubricsByQuestion.has(questionKey)) {
        rubricsByQuestion.set(questionKey, []);
      }
      rubricsByQuestion.get(questionKey)!.push(rubric);
    }

    // Create rubrics for each question in order
    for (const [questionKey, rubrics] of rubricsByQuestion.entries()) {
      const foundQuestion = createdQuestions.get(questionKey);

      if (!foundQuestion) {
        const [paperName, questionNumber] = questionKey.split('-');
        notification.warning({
          message: `Question not found`,
          description: `Question ${questionNumber} in paper "${paperName}" not found. Rubrics for this question will be skipped.`,
        });
        continue;
      }

      // Create rubrics for this question
      for (const rubric of rubrics) {
        try {
          await rubricItemService.createRubricItem({
            description: rubric.description,
            input: rubric.input,
            output: rubric.output,
            score: rubric.score,
            assessmentQuestionId: foundQuestion.id,
          });
        } catch (error: any) {
          console.error(`Failed to create rubric for question ${questionKey}:`, error);
          notification.warning({
            message: `Failed to create rubric`,
            description: error.message || "Unknown error",
          });
        }
      }
    }

    // ============================================
    // STEP 10: Refresh data and notify
    // ============================================
    await refetchTemplates();
    await fetchAllData(currentTemplate.id);
    await resetStatusIfRejected();

    notification.success({
      message: "Import Successful",
      description: `Imported template "${templateName}" with ${paperData.length} papers, ${questionData.length} questions, and ${rubricData.length} rubrics.`,
    });
    
    // Dispatch custom event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('assessmentTemplatesChanged'));
    }
  } catch (error: any) {
    console.error("Failed to import template:", error);
    notification.error({
      message: "Import Failed",
      description: error.message || "Failed to import template. Please check the file format.",
    });
    throw error;
  }
}
