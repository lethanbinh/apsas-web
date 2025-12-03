"use client";

import { useQueryClient as useCustomQueryClient } from "@/hooks/useQueryClient";
import { queryKeys } from "@/lib/react-query";
import {
  AssessmentFile,
  assessmentFileService,
} from "@/services/assessmentFileService";
import {
  AssessmentPaper,
  assessmentPaperService,
} from "@/services/assessmentPaperService";
import {
  AssessmentQuestion,
  assessmentQuestionService,
} from "@/services/assessmentQuestionService";
import {
  AssessmentTemplate,
  assessmentTemplateService,
} from "@/services/assessmentTemplateService";
import { AssignRequestItem, assignRequestService } from "@/services/assignRequestService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { BookOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, FileTextOutlined, InboxOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { UploadProps } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Layout,
  Menu,
  Radio,
  Select,
  Space,
  Spin,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { CreateTemplateForm } from "./LecturerTaskContent/CreateTemplateForm";
import { PaperDetailView } from "./LecturerTaskContent/PaperDetailView";
import { PaperFormModal } from "./LecturerTaskContent/PaperFormModal";
import { QuestionDetailView } from "./LecturerTaskContent/QuestionDetailView";
import { QuestionFormModal } from "./LecturerTaskContent/QuestionFormModal";
import { TemplateDetailView } from "./LecturerTaskContent/TemplateDetailView";
import { UploadFileModal } from "./LecturerTaskContent/UploadFileModal";
import styles from "./Tasks.module.css";
import "./TasksGlobal.css";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;


// --- Component Chính: LecturerTaskContent ---
export const LecturerTaskContent = ({
  task,
  lecturerId,
}: {
  task: AssignRequestItem;
  lecturerId: number;
}) => {
  const queryClient = useCustomQueryClient();
  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("template-details");

  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [paperForNewQuestion, setPaperForNewQuestion] = useState<
    number | undefined
  >(undefined);
  const [paperToEdit, setPaperToEdit] = useState<AssessmentPaper | null>(null);
  const [papers, setPapers] = useState<AssessmentPaper[]>([]);
  const [allQuestions, setAllQuestions] = useState<{ [paperId: number]: AssessmentQuestion[] }>({});
  const [files, setFiles] = useState<AssessmentFile[]>([]);

  const { modal, notification } = App.useApp();

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [newTemplateType, setNewTemplateType] = useState(0);
  const [newTemplateStartupProject, setNewTemplateStartupProject] = useState("");
  const [databaseFileList, setDatabaseFileList] = useState<UploadFile[]>([]);
  const [postmanFileList, setPostmanFileList] = useState<UploadFile[]>([]);
  const [databaseName, setDatabaseName] = useState("");
  const [databaseFileName, setDatabaseFileName] = useState("");
  const [postmanFileName, setPostmanFileName] = useState("");
  const [importFileListForNewTemplate, setImportFileListForNewTemplate] = useState<UploadFile[]>([]);
  const [isDatabaseUploadModalOpen, setIsDatabaseUploadModalOpen] = useState(false);
  const [isPostmanUploadModalOpen, setIsPostmanUploadModalOpen] = useState(false);
  const [databaseUploadFileList, setDatabaseUploadFileList] = useState<UploadFile[]>([]);
  const [postmanUploadFileList, setPostmanUploadFileList] = useState<UploadFile[]>([]);

  // Allow editing when status is Pending (1), In Progress (4), or Rejected (3)
  // When Rejected, lecturer can edit template and resubmit
  const isEditable = [1, 3, 4].includes(Number(task.status));
  const isRejected = Number(task.status) === 3;

  // Helper function to reset status to Pending if currently Rejected
  const resetStatusIfRejected = async () => {
    if (isRejected) {
      try {
        await assignRequestService.updateAssignRequest(task.id, {
          message: task.message || "Content updated and resubmitted after rejection",
          courseElementId: task.courseElementId,
          assignedLecturerId: task.assignedLecturerId,
          assignedByHODId: task.assignedByHODId,
          status: 1, // Reset to Pending
          assignedAt: task.assignedAt,
        });
        notification.success({
          message: "Status Reset to Pending",
          description: "Content has been updated and status reset to Pending for HOD review.",
        });
      } catch (err: any) {
        console.error("Failed to reset status:", err);
        notification.warning({
          message: "Content Updated",
          description: "Content updated successfully, but failed to reset status. Please contact administrator.",
        });
      }
    }
  };

  // --- Logic Fetch Data ---

  const fetchAllData = async (templateId: number) => {
    try {
      const paperResponse = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: templateId,
        pageNumber: 1,
        pageSize: 100,
      });
      setPapers(paperResponse.items);

      const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
      for (const paper of paperResponse.items) {
        const questionResponse =
          await assessmentQuestionService.getAssessmentQuestions({
            assessmentPaperId: paper.id,
            pageNumber: 1,
            pageSize: 100,
          });
        // Sort questions by questionNumber
        const sortedQuestions = [...questionResponse.items].sort((a, b) => 
          (a.questionNumber || 0) - (b.questionNumber || 0)
        );
        questionsMap[paper.id] = sortedQuestions;
      }
      setAllQuestions(questionsMap);

      const fileResponse = await assessmentFileService.getFilesForTemplate({
        assessmentTemplateId: templateId,
        pageNumber: 1,
        pageSize: 100,
      });
      setFiles(fileResponse.items);
    } catch (error) {
      console.error("Failed to fetch all data:", error);
    }
  };

  // Fetch templates using TanStack Query
  const { data: templatesResponse, isLoading: isLoadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ lecturerId, courseElementId: task.courseElementId }),
    queryFn: async () => {
      const response = await assessmentTemplateService.getAssessmentTemplates({
        lecturerId: lecturerId,
        pageNumber: 1,
        pageSize: 1000,
      });
      // Filter templates by courseElementId
      return response.items.filter((t) => t.courseElementId === task.courseElementId);
    },
  });

  const templates = templatesResponse || [];
  const isLoading = isLoadingTemplates;

  // Auto-select template that belongs to current task
  useEffect(() => {
    if (templates.length > 0 && !template) {
      // Find template that belongs to current assign request
      const taskTemplate = templates.find((t) => t.assignRequestId === task.id);
      if (taskTemplate) {
        setTemplate(taskTemplate);
        fetchAllData(taskTemplate.id);
      } else if (templates.length === 1) {
        // If only one template exists, use it
        setTemplate(templates[0]);
        fetchAllData(templates[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, task.id]);

  const refreshPapers = async (shouldResetStatus = false) => {
    if (!template) return;
    try {
      const paperResponse = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: template.id,
        pageNumber: 1,
        pageSize: 100,
      });
      setPapers(paperResponse.items);
      // Giữ cho questionsMap đồng bộ
      const newQuestionsMap = { ...allQuestions };
      paperResponse.items.forEach((p) => {
        if (!newQuestionsMap[p.id]) {
          newQuestionsMap[p.id] = [];
        }
      });
      setAllQuestions(newQuestionsMap);
      
      // Reset status if needed
      if (shouldResetStatus) {
        await resetStatusIfRejected();
      }
    } catch (error) {
      console.error("Failed to refresh papers:", error);
    }
  };

  const refreshQuestions = async (paperId: number, shouldResetStatus = false) => {
    try {
      const questionResponse =
        await assessmentQuestionService.getAssessmentQuestions({
          assessmentPaperId: paperId,
          pageNumber: 1,
          pageSize: 100,
        });
      // Sort questions by questionNumber
      const sortedQuestions = [...questionResponse.items].sort((a, b) => 
        (a.questionNumber || 0) - (b.questionNumber || 0)
      );
      setAllQuestions((prev) => ({
        ...prev,
        [paperId]: sortedQuestions,
      }));
      
      // Reset status if needed
      if (shouldResetStatus) {
        await resetStatusIfRejected();
      }
    } catch (error) {
      console.error("Failed to refresh questions:", error);
    }
  };

  const refreshFiles = async (shouldResetStatus = false) => {
    if (!template) return;
    try {
      const fileResponse = await assessmentFileService.getFilesForTemplate({
        assessmentTemplateId: template.id,
        pageNumber: 1,
        pageSize: 100,
      });
      setFiles(fileResponse.items);
      
      // Reset status if needed
      if (shouldResetStatus) {
        await resetStatusIfRejected();
      }
    } catch (error) {
      console.error("Failed to refresh files:", error);
    }
  };

  useEffect(() => {
    refetchTemplates();
  }, [task.id, task.courseElementId, lecturerId, refetchTemplates]);

  // Handle template selection change
  const handleTemplateChange = async (templateId: number) => {
    const selectedTemplate = templates.find((t) => t.id === templateId);
    if (selectedTemplate) {
      setTemplate(selectedTemplate);
      setSelectedKey("template-details"); // Reset to template overview
      await fetchAllData(selectedTemplate.id);
    }
  };

  // --- Logic Xử lý sự kiện ---

  // Validate SQL file
  const beforeUploadSql: UploadProps["beforeUpload"] = (file) => {
    const fileName = file.name.toLowerCase();
    const isSqlExtension = fileName.endsWith(".sql");
    
    if (!isSqlExtension) {
      notification.error({
        message: "Invalid File Type",
        description: "Only SQL files are accepted! Please select a file with .sql extension",
      });
      return Upload.LIST_IGNORE;
    }
    
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      notification.error({
        message: "File Too Large",
        description: "File must be smaller than 100MB!",
      });
      return Upload.LIST_IGNORE;
    }
    
    return false;
  };

  // Validate Postman collection file
  const beforeUploadPostman: UploadProps["beforeUpload"] = (file) => {
    const fileName = file.name.toLowerCase();
    const isPostmanExtension = fileName.endsWith(".postman_collection");
    
    if (!isPostmanExtension) {
      notification.error({
        message: "Invalid File Type",
        description: "Only Postman collection files are accepted! Please select a file with .postman_collection extension",
      });
      return Upload.LIST_IGNORE;
    }
    
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      notification.error({
        message: "File Too Large",
        description: "File must be smaller than 100MB!",
      });
      return Upload.LIST_IGNORE;
    }
    
    return false;
  };

  const handleDatabaseFileChange: UploadProps["onChange"] = (info) => {
    let newFileList = [...info.fileList];
    newFileList = newFileList.slice(-1);
    setDatabaseFileList(newFileList);
  };

  const handlePostmanFileChange: UploadProps["onChange"] = (info) => {
    let newFileList = [...info.fileList];
    newFileList = newFileList.slice(-1);
    setPostmanFileList(newFileList);
  };

  // Handle upload database file via modal (when creating template)
  const handleDatabaseUploadViaModal = (values: { name: string; databaseName?: string; file: File }) => {
    setDatabaseFileName(values.name);
    setDatabaseName(values.databaseName || "");
    // Set file to databaseFileList
    const uploadFile: UploadFile = {
      uid: `-${Date.now()}`,
      name: values.file.name,
      status: 'done',
      originFileObj: values.file as any,
      size: values.file.size,
    };
    setDatabaseFileList([uploadFile]);
    setIsDatabaseUploadModalOpen(false);
    setDatabaseUploadFileList([]);
    notification.success({ message: "Database file selected successfully" });
  };

  // Handle upload postman file via modal (when creating template)
  const handlePostmanUploadViaModal = (values: { name: string; databaseName?: string; file: File }) => {
    setPostmanFileName(values.name);
    // Set file to postmanFileList
    const uploadFile: UploadFile = {
      uid: `-${Date.now()}`,
      name: values.file.name,
      status: 'done',
      originFileObj: values.file as any,
      size: values.file.size,
    };
    setPostmanFileList([uploadFile]);
    setIsPostmanUploadModalOpen(false);
    setPostmanUploadFileList([]);
    notification.success({ message: "Postman file selected successfully" });
  };

  // Clear database and postman files if template type is not WEBAPI
  useEffect(() => {
    if (newTemplateType !== 1) {
      setDatabaseFileList([]);
      setPostmanFileList([]);
    }
  }, [newTemplateType]);

  const handleCreateTemplate = async () => {
    try {
      // Validate: Check if there's already a template for this task (not rejected)
      // If rejected, allow creating a new template or editing existing one
      const taskTemplate = templates.find((t) => t.assignRequestId === task.id);
      if (taskTemplate && !isRejected) {
        notification.error({
          message: "Template Already Exists",
          description: `This task already has a template. Please edit the existing template instead.`,
        });
        return;
      }
      
      // If rejected and template exists, allow creating new template for resubmission
      // (This will create a new template, and the old rejected one can be ignored)

      // Validate: Check if template name is provided
      if (!newTemplateName.trim()) {
        notification.error({
          message: "Template Name Required",
          description: "Please provide a template name.",
        });
        return;
      }

      // Validate: If template type is WEBAPI (1), both database and postman files are required
      if (newTemplateType === 1) {
        if (!newTemplateStartupProject.trim()) {
          notification.error({
            message: "Startup Project Required",
            description: "Startup Project is required for WEBAPI templates.",
          });
          return;
        }
        if (databaseFileList.length === 0) {
          notification.error({
            message: "Database File Required",
            description: "Database file (.sql) is required for WEBAPI templates.",
          });
          return;
        }
        if (!databaseFileName.trim()) {
          notification.error({
            message: "Database File Name Required",
            description: "Please enter database file name.",
          });
          return;
        }
        if (!databaseName.trim()) {
          notification.error({
            message: "Database Name Required",
            description: "Please enter database name.",
          });
          return;
        }
        if (postmanFileList.length === 0) {
          notification.error({
            message: "Postman Collection File Required",
            description: "Postman collection file (.postman_collection.json) is required for WEBAPI templates.",
          });
          return;
        }
        if (!postmanFileName.trim()) {
          notification.error({
            message: "Postman File Name Required",
            description: "Please enter postman file name.",
          });
          return;
        }
      }

      // Create template
      const createdTemplate = await assessmentTemplateService.createAssessmentTemplate({
        name: newTemplateName,
        description: newTemplateDesc,
        templateType: newTemplateType,
        startupProject: newTemplateType === 1 ? newTemplateStartupProject : undefined,
        assignRequestId: task.id,
        createdByLecturerId: lecturerId,
        assignedToHODId: task.assignedByHODId,
      });

      // Upload database and postman collection files for WEBAPI template
      if (newTemplateType === 1 && createdTemplate.id) {
        // Upload database file (template=0)
        if (databaseFileList.length > 0) {
          const databaseFile = databaseFileList[0].originFileObj;
          if (databaseFile) {
            try {
              await assessmentFileService.createAssessmentFile({
                File: databaseFile,
                Name: databaseFileName || databaseFile.name,
                DatabaseName: databaseName,
                FileTemplate: 0,
                AssessmentTemplateId: createdTemplate.id,
              });
            } catch (err: any) {
              console.error("Failed to upload database file:", err);
              notification.error({
                message: "Failed to Upload Database File",
                description: err.message || "An unknown error occurred while uploading the database file.",
              });
              // Still continue to show success for template creation
            }
          }
        }

        // Upload postman collection file (template=1)
        if (postmanFileList.length > 0) {
          const postmanFile = postmanFileList[0].originFileObj;
          if (postmanFile) {
            try {
              await assessmentFileService.createAssessmentFile({
                File: postmanFile,
                Name: postmanFileName || postmanFile.name,
                FileTemplate: 1,
                AssessmentTemplateId: createdTemplate.id,
              });
            } catch (err: any) {
              console.error("Failed to upload postman collection file:", err);
              notification.error({
                message: "Failed to Upload Postman Collection File",
                description: err.message || "An unknown error occurred while uploading the postman collection file.",
              });
              // Still continue to show success for template creation
            }
          }
        }
      }

      setNewTemplateName("");
      setNewTemplateDesc("");
      setNewTemplateType(0);
      setNewTemplateStartupProject("");
      setDatabaseFileList([]);
      setPostmanFileList([]);
      setDatabaseName("");
      setDatabaseFileName("");
      setPostmanFileName("");
      
      // If this was a resubmission after rejection, reset status to Pending
      if (isRejected) {
        try {
          await assignRequestService.updateAssignRequest(task.id, {
            message: task.message || "Template resubmitted after rejection",
            courseElementId: task.courseElementId,
            assignedLecturerId: task.assignedLecturerId,
            assignedByHODId: task.assignedByHODId,
            status: 1, // Reset to Pending
            assignedAt: task.assignedAt,
          });
          notification.success({
            message: "Template Created and Resubmitted",
            description: "Template has been created and status reset to Pending for HOD review.",
          });
        } catch (err: any) {
          console.error("Failed to reset status:", err);
          notification.warning({
            message: "Template Created",
            description: "Template created successfully, but failed to reset status. Please contact administrator.",
          });
        }
      } else {
        notification.success({
          message: "Template Created",
          description: "Template has been created successfully.",
        });
      }
      
      await refetchTemplates();
    } catch (error: any) {
      console.error("Failed to create template:", error);
      notification.error({
        message: "Failed to Create Template",
        description: error.response?.data?.errorMessages?.[0] || error.message || "An unknown error occurred.",
      });
    }
  };

  const handleDeleteTemplate = async () => {
    if (!template) return;
    try {
      await assessmentTemplateService.deleteAssessmentTemplate(template.id);
      // Refresh templates list after deletion
      await refetchTemplates();
      await resetStatusIfRejected();
      notification.success({ message: "Template deleted" });
    } catch (error: any) {
      notification.error({
        message: "Failed to delete template",
        description: error.message || "An unknown error occurred.",
      });
    }
  };

  const handleDownloadTemplate = async (templateToDownload?: AssessmentTemplate | null) => {
    const targetTemplate = templateToDownload || template;
    
    // If no template exists, create a sample template structure for download
    // Include both DSA and WEBAPI sample data in the template
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

      // Sheet 1: Assessment Template
      // Always include Startup Project field in the template, but only require it for WEBAPI
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

      // Sheet 2: Papers - Use actual data if available, otherwise use sample
      let papersData: any[][];
      const targetPapers = finalTemplate === template ? papers : [];
      if (targetPapers.length > 0) {
        // Deduplicate papers by name, description, and language
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
        // Sample data (no duplicates)
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

      // Sheet 3: Questions - Use actual data if available, otherwise use sample
      let questionsData: any[][];
      const targetAllQuestions = finalTemplate === template ? allQuestions : {};
      if (targetPapers.length > 0 && Object.keys(targetAllQuestions).length > 0) {
        // Collect all questions and deduplicate
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
        // Sample data (no duplicates)
        questionsData = [
          ["QUESTIONS"],
          ["Paper Name", "Question Number", "Question Text", "Sample Input", "Sample Output", "Score", "Instructions"],
          ["Paper 1", 1, "Write a function to calculate factorial", "5", "120", 10, "Paper Name must match a paper from Papers sheet"],
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

      // Sheet 4: Rubrics - Use actual data if available, otherwise use sample
      let rubricsData: any[][];
      if (targetPapers.length > 0 && Object.keys(targetAllQuestions).length > 0) {
        // Fetch all rubrics for all questions
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
        
        // Deduplicate rubrics
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
        // Sample data (no duplicates)
        rubricsData = [
          ["RUBRICS"],
          ["Paper Name", "Question Number", "Description", "Input", "Output", "Score", "Instructions"],
          ["Paper 1", 1, "Correct input/output format", "4 9 2", "9", 5, "Paper Name and Question Number must match from Questions sheet"],
          ["Paper 1", 1, "Handles edge cases", "0", "0", 3, ""],
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

      // Set column widths
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
    }
  };

  const handleImportTemplate = async (file: File, existingTemplate?: AssessmentTemplate | null) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      // Read Assessment Template sheet
      const templateSheet = workbook.Sheets["Assessment Template"];
      if (!templateSheet) {
        throw new Error("Assessment Template sheet not found");
      }
      const templateRows = XLSX.utils.sheet_to_json(templateSheet, { header: 1 }) as any[][];
      
      // Extract template info (skip header rows)
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
              // Default to 0 if invalid type is provided
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

      // Validate template name
      if (!templateName) {
        throw new Error("Template name is required in the Assessment Template sheet");
      }

      // Validate startupProject for WEBAPI template
      if (templateType === 1 && !startupProject) {
        throw new Error("Startup Project is required for WEBAPI templates in the Assessment Template sheet");
      }

      // Create or update template
      let currentTemplate: AssessmentTemplate;
      if (existingTemplate) {
        // Update existing template if changed
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
        // Create new template
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

        // If this was a resubmission after rejection, reset status to Pending
        if (isRejected) {
          try {
            await assignRequestService.updateAssignRequest(task.id, {
              message: task.message || "Template imported and resubmitted after rejection",
              courseElementId: task.courseElementId,
              assignedLecturerId: task.assignedLecturerId,
              assignedByHODId: task.assignedByHODId,
              status: 1, // Reset to Pending
              assignedAt: task.assignedAt,
            });
          } catch (err: any) {
            console.error("Failed to reset status:", err);
          }
        }
      }

      // Read Papers sheet
      const papersSheet = workbook.Sheets["Papers"];
      if (!papersSheet) {
        throw new Error("Papers sheet not found");
      }
      const papersRows = XLSX.utils.sheet_to_json(papersSheet, { header: 1 }) as any[][];
      
      // Skip header rows (first 2 rows)
      // Use Map to deduplicate papers by name, description, and language
      const paperDataMap = new Map<string, { name: string; description: string; language: number }>();
      for (let i = 2; i < papersRows.length; i++) {
        const row = papersRows[i];
        if (row && row[0] && String(row[0]).trim() && !String(row[0]).startsWith("INSTRUCTIONS")) {
          const name = String(row[0]).trim();
          const description = row[1] ? String(row[1]).trim() : "";
          let language = 0; // Default CSharp
          if (row[2]) {
            const langStr = String(row[2]).toLowerCase();
            if (langStr.includes("c") && !langStr.includes("sharp")) language = 1;
            else if (langStr.includes("java")) language = 2;
          }
          // Create unique key for paper (name + description + language)
          const paperKey = `${name}|${description}|${language}`;
          if (!paperDataMap.has(paperKey)) {
            paperDataMap.set(paperKey, { name, description, language });
          }
        }
      }
      const paperData = Array.from(paperDataMap.values());

      // Read Questions sheet
      const questionsSheet = workbook.Sheets["Questions"];
      if (!questionsSheet) {
        throw new Error("Questions sheet not found");
      }
      const questionsRows = XLSX.utils.sheet_to_json(questionsSheet, { header: 1 }) as any[][];
      
      // Skip header rows
      // Use Map to deduplicate questions by paperName, questionNumber, questionText, sampleInput, sampleOutput, and score
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
        if (row && row[0] && String(row[0]).trim() && !String(row[0]).startsWith("INSTRUCTIONS")) {
          const paperName = String(row[0]).trim();
          const questionNumber = row[1] ? Number(row[1]) : 0;
          const questionText = row[2] ? String(row[2]).trim() : "";
          const sampleInput = row[3] ? String(row[3]).trim() : "";
          const sampleOutput = row[4] ? String(row[4]).trim() : "";
          const score = row[5] ? Number(row[5]) : 0;
          if (paperName && questionNumber > 0 && questionText) {
            // Create unique key for question (paperName + questionNumber + questionText + sampleInput + sampleOutput + score)
            const questionKey = `${paperName}|${questionNumber}|${questionText}|${sampleInput}|${sampleOutput}|${score}`;
            if (!questionDataMap.has(questionKey)) {
              questionDataMap.set(questionKey, { paperName, questionNumber, questionText, sampleInput, sampleOutput, score });
            }
          }
        }
      }
      const questionData = Array.from(questionDataMap.values());

      // Read Rubrics sheet
      const rubricsSheet = workbook.Sheets["Rubrics"];
      if (!rubricsSheet) {
        throw new Error("Rubrics sheet not found");
      }
      const rubricsRows = XLSX.utils.sheet_to_json(rubricsSheet, { header: 1 }) as any[][];
      
      // Skip header rows
      // Use Map to deduplicate rubrics by paperName, questionNumber, description, input, output, and score
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
        if (row && row[0] && String(row[0]).trim() && !String(row[0]).startsWith("INSTRUCTIONS")) {
          const paperName = String(row[0]).trim();
          const questionNumber = row[1] ? Number(row[1]) : 0;
          const description = row[2] ? String(row[2]).trim() : "";
          const input = row[3] ? String(row[3]).trim() : "";
          const output = row[4] ? String(row[4]).trim() : "";
          const score = row[5] ? Number(row[5]) : 0;
          if (paperName && questionNumber > 0 && description) {
            // Create unique key for rubric (paperName + questionNumber + description + input + output + score)
            const rubricKey = `${paperName}|${questionNumber}|${description}|${input}|${output}|${score}`;
            if (!rubricDataMap.has(rubricKey)) {
              rubricDataMap.set(rubricKey, { paperName, questionNumber, description, input, output, score });
            }
          }
        }
      }
      const rubricData = Array.from(rubricDataMap.values());

      // Create papers - using the template ID we just created/updated
      // Use unique key (name|description|language) to map papers
      const createdPapers = new Map<string, AssessmentPaper>();
      for (const paper of paperData) {
        try {
          const paperKey = `${paper.name}|${paper.description}|${paper.language}`;
          // Check if paper already exists in map (shouldn't happen after deduplication, but just in case)
          if (createdPapers.has(paperKey)) {
            continue; // Skip if already created
          }
          const createdPaper = await assessmentPaperService.createAssessmentPaper({
            name: paper.name,
            description: paper.description,
            assessmentTemplateId: currentTemplate.id, // Use the template ID from creation/update
            language: paper.language,
          });
          createdPapers.set(paperKey, createdPaper);
          // Also set by name for backward compatibility with question/rubric lookup
          // But only if name is unique, otherwise use the full key
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

      // Create questions - group by paper first
      const questionsByPaper = new Map<string, typeof questionData>();
      for (const question of questionData) {
        if (!questionsByPaper.has(question.paperName)) {
          questionsByPaper.set(question.paperName, []);
        }
        questionsByPaper.get(question.paperName)!.push(question);
      }

      const createdQuestions = new Map<string, AssessmentQuestion>(); // key: "paperName-questionNumber"
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
            // Use "paperName-questionNumber" as key for easier lookup
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

      // Create rubrics - match by paperName and questionNumber
      for (const rubric of rubricData) {
        // Find question by paperName and questionNumber
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

      // Refresh all data
      await refetchTemplates(); // Refresh templates list to get the new/updated template
      await fetchAllData(currentTemplate.id);
      await resetStatusIfRejected();

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
  };

  const handleExport = async () => {
    if (!template) return;
    
    // Ensure this only runs on client-side
    if (typeof window === 'undefined') {
      notification.error({
        message: "Export Failed",
        description: "Export is only available in the browser.",
      });
      return;
    }
    
    try {
      // Dynamically import docx and file-saver to avoid build issues
      // These modules are only loaded when user clicks export button (client-side only)
      // Use dynamic import with proper error handling
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
  };

  const openAddQuestionModal = (paperId: number) => {
    setPaperForNewQuestion(paperId);
    setIsQuestionModalOpen(true);
  };

  const openEditPaperModal = (paper: AssessmentPaper) => {
    setPaperToEdit(paper);
    setIsPaperModalOpen(true);
  };

  const handleDeletePaper = (paper: AssessmentPaper) => {
    modal.confirm({
      title: `Delete paper: ${paper.name}?`,
      content: "All questions and rubrics inside will also be deleted.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await assessmentPaperService.deleteAssessmentPaper(paper.id);
          notification.success({ message: "Paper deleted" });
          await refreshPapers(true); // Reset status if rejected
          setSelectedKey("template-details"); // Chuyển về view template
        } catch (error) {
          notification.error({ message: "Failed to delete paper" });
        }
      },
    });
  };

  const handleDeleteQuestion = (question: AssessmentQuestion) => {
    modal.confirm({
      title: `Delete this question?`,
      content: "All rubrics inside will also be deleted.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await assessmentQuestionService.deleteAssessmentQuestion(question.id);
          notification.success({ message: "Question deleted" });
          await refreshQuestions(question.assessmentPaperId, true); // Reset status if rejected
          setSelectedKey(`paper-${question.assessmentPaperId}`); // Chuyển về view paper
        } catch (error) {
          notification.error({ message: "Failed to delete question" });
        }
      },
    });
  };

  const renderSiderMenu = () => {
    const menuItems = papers.map((paper) => {
      const questions = allQuestions[paper.id] || [];
      return {
        key: `paper-${paper.id}`,
        icon: <BookOutlined />,
        label: (
          <span className={styles.menuLabel}>
            <span className={styles.menuLabelText}>{paper.name}</span>
            {isCurrentTemplateEditable && (
              <Space className={styles.menuActions}>
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openAddQuestionModal(paper.id);
                  }}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditPaperModal(paper);
                  }}
                />
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePaper(paper);
                  }}
                />
              </Space>
            )}
          </span>
        ),
        children: [...questions].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((q) => ({
          key: `question-${q.id}`,
          icon: <FileTextOutlined />,
          label: (
            <span className={styles.menuLabel}>
              <span className={styles.menuLabelText}>
                {q.questionNumber ? `Q${q.questionNumber}: ` : ""}{q.questionText.substring(0, 30)}...
              </span>
              {isCurrentTemplateEditable && (
                <Space className={styles.menuActions}>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteQuestion(q);
                    }}
                  />
                </Space>
              )}
            </span>
          ),
        })),
      };
    });

    return (
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        onSelect={({ key }) => setSelectedKey(key)}
        items={[
          {
            key: "template-details",
            icon: <InboxOutlined />,
            label: "Template Overview",
          },
          ...menuItems,
        ]}
        // **THAY ĐỔI: Bỏ `height: "100%"`**
        style={{ borderRight: 0 }}
      />
    );
  };

  const refreshTemplate = async (shouldResetStatus = false) => {
    // Refresh toàn bộ templates và các dữ liệu liên quan
    await refetchTemplates();
    
    // Reset status if needed
    if (shouldResetStatus) {
      await resetStatusIfRejected();
    }
  };

  // Check if current template is editable (belongs to current assign request)
  const isCurrentTemplateEditable = template?.assignRequestId === task.id && isEditable;

  const renderContent = () => {
    if (selectedKey === "template-details") {
      return (
        <TemplateDetailView
          template={template!}
          papers={papers}
          files={files}
          isEditable={isCurrentTemplateEditable}
          onFileChange={() => refreshFiles(true)}
          onExport={handleExport}
          onTemplateDelete={handleDeleteTemplate}
          onTemplateChange={async () => {
            await refreshTemplate(true);
          }}
          assignedToHODId={task.assignedByHODId}
          task={task}
          onResetStatus={resetStatusIfRejected}
        />
      );
    }

    if (selectedKey.startsWith("paper-")) {
      const paperId = Number(selectedKey.split("-")[1]);
      const paper = papers.find((p) => p.id === paperId);
      if (paper) {
        return (
          <PaperDetailView
            paper={paper}
            isEditable={isCurrentTemplateEditable}
            onPaperChange={() => refreshPapers(true)}
            onResetStatus={resetStatusIfRejected}
          />
        );
      }
    }

    if (selectedKey.startsWith("question-")) {
      const questionId = Number(selectedKey.split("-")[1]);
      let question: AssessmentQuestion | undefined;
      let paperId: number | undefined;

      for (const pId in allQuestions) {
        const found = allQuestions[pId].find((q) => q.id === questionId);
        if (found) {
          question = found;
          paperId = Number(pId);
          break;
        }
      }

      if (question && paperId) {
        return (
          <QuestionDetailView
            question={question}
            isEditable={isCurrentTemplateEditable}
            onRubricChange={() => refreshQuestions(paperId!, true)} // Reset status if rejected
            onQuestionChange={() => refreshQuestions(paperId!, true)}
            onResetStatus={resetStatusIfRejected}
          />
        );
      }
    }
    return <Alert message="Please select an item from the menu." />;
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={`${styles["task-content"]} ${styles["nested-content"]}`}>
      {isRejected && (
        <Alert
          message="Template Rejected"
          description="This template has been rejected. You can edit the existing template or create a new one. After making changes, the status will be reset to Pending for HOD review."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {!template ? (
        isEditable ? (
          (() => {
            // Check if there's a template for this task
            const taskTemplate = templates.find((t) => t.assignRequestId === task.id);
            // Check if there are other templates (not for this task)
            const otherTemplates = templates.filter((t) => t.assignRequestId !== task.id);
            
            if (otherTemplates.length > 0 && !isRejected && !taskTemplate) {
              // If there are templates for other tasks but not for this task (and not rejected)
              // Allow selecting existing template
              return (
                <Card title="Select Existing Template">
                  <Alert
                    message="Template Already Exists"
                    description={`This course element already has ${otherTemplates.length} template(s) for other tasks. Please select an existing template to use.`}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Select
                    value={undefined}
                    onChange={handleTemplateChange}
                    style={{ width: "100%" }}
                    placeholder="Select a template"
                  >
                    {otherTemplates.map((t) => (
                      <Select.Option key={t.id} value={t.id}>
                        {t.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Card>
              );
            }
            // No template exists, allow creation
            return (
              <CreateTemplateForm
                newTemplateName={newTemplateName}
                newTemplateDesc={newTemplateDesc}
                newTemplateType={newTemplateType}
                newTemplateStartupProject={newTemplateStartupProject}
                databaseFileList={databaseFileList}
                postmanFileList={postmanFileList}
                databaseName={databaseName}
                databaseFileName={databaseFileName}
                postmanFileName={postmanFileName}
                importFileListForNewTemplate={importFileListForNewTemplate}
                isDatabaseUploadModalOpen={isDatabaseUploadModalOpen}
                isPostmanUploadModalOpen={isPostmanUploadModalOpen}
                databaseUploadFileList={databaseUploadFileList}
                postmanUploadFileList={postmanUploadFileList}
                onTemplateNameChange={setNewTemplateName}
                onTemplateDescChange={setNewTemplateDesc}
                onTemplateTypeChange={setNewTemplateType}
                onStartupProjectChange={setNewTemplateStartupProject}
                onDatabaseUploadModalOpen={() => setIsDatabaseUploadModalOpen(true)}
                onPostmanUploadModalOpen={() => setIsPostmanUploadModalOpen(true)}
                onDatabaseUploadModalClose={() => {
                  setIsDatabaseUploadModalOpen(false);
                  setDatabaseUploadFileList([]);
                }}
                onPostmanUploadModalClose={() => {
                  setIsPostmanUploadModalOpen(false);
                  setPostmanUploadFileList([]);
                }}
                onDatabaseUploadFileListChange={setDatabaseUploadFileList}
                onPostmanUploadFileListChange={setPostmanUploadFileList}
                onDatabaseUploadViaModal={handleDatabaseUploadViaModal}
                onPostmanUploadViaModal={handlePostmanUploadViaModal}
                onCreateTemplate={handleCreateTemplate}
                onDownloadTemplate={() => handleDownloadTemplate(null)}
                onImportTemplate={(file: File) => {
                  const uploadFile: UploadFile = {
                    uid: "-1",
                    name: file.name,
                    status: "uploading",
                    originFileObj: file as any,
                  };
                  setImportFileListForNewTemplate([uploadFile]);
                  handleImportTemplate(file, null);
                  setTimeout(() => {
                    setImportFileListForNewTemplate([]);
                  }, 1000);
                }}
              />
            );
          })()
        ) : (
          <Alert
            message="No template created for this task."
            description="You do not have permission to create a template. Please contact the administrator."
            type="info"
            showIcon
          />
        )
      ) : (
        <>
          <Layout
            style={{
              background: "#f5f5f5",
              padding: "16px 0",
              minHeight: "70vh",
            }}
          >
            <Sider
              width={300}
              style={{
                background: "#fff",
                marginRight: 16,
                display: "flex",
                flexDirection: "column",
                maxHeight: "70vh",
              }}
            >
              <div
                style={{
                  padding: "16px",
                  borderBottom: "1px solid #f0f0f0",
                  flexShrink: 0,
                }}
              >
                {templates.length > 1 && (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                      Select Template:
                    </Text>
                    <Select
                      value={template?.id}
                      onChange={handleTemplateChange}
                      style={{ width: "100%" }}
                      placeholder="Select a template"
                    >
                      {templates.map((t) => (
                        <Select.Option key={t.id} value={t.id}>
                          {t.name} {t.assignRequestId === task.id ? "(Current)" : ""}
                        </Select.Option>
                      ))}
                    </Select>
                  </div>
                )}
                <Title 
                  level={5} 
                  style={{ 
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%'
                  }}
                >
                  {template.name}
                </Title>
                <Text type="secondary">Exam Structure</Text>
                {template.assignRequestId === task.id && isEditable && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsPaperModalOpen(true)}
                    style={{ width: "100%", marginTop: 16 }}
                  >
                    Add New Paper
                  </Button>
                )}
                {template.assignRequestId !== task.id && (
                  <Alert
                    message="Viewing template from another assign request"
                    type="info"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                )}
              </div>

              <div style={{ flex: 1, overflowY: "auto" }}>
                {renderSiderMenu()}
              </div>
            </Sider>

            <Content
              style={{
                background: "#fff",
                padding: 24,
                overflowY: "auto",
                maxHeight: "70vh",
              }}
            >
              {renderContent()}
            </Content>
          </Layout>

          {/* Modals */}
          <PaperFormModal
            open={isPaperModalOpen}
            onCancel={() => {
              setIsPaperModalOpen(false);
              setPaperToEdit(null);
            }}
            onFinish={() => {
              setIsPaperModalOpen(false);
              setPaperToEdit(null);
              refreshPapers(true); // Reset status if rejected
            }}
            isEditable={isCurrentTemplateEditable}
            templateId={template.id}
            initialData={paperToEdit || undefined}
          />
          <QuestionFormModal
            open={isQuestionModalOpen}
            onCancel={() => {
              setIsQuestionModalOpen(false);
              setPaperForNewQuestion(undefined);
            }}
            onFinish={() => {
              setIsQuestionModalOpen(false);
              refreshQuestions(paperForNewQuestion!, true); // Reset status if rejected
              setPaperForNewQuestion(undefined);
            }}
            isEditable={isCurrentTemplateEditable}
            paperId={paperForNewQuestion}
            existingQuestionsCount={
              paperForNewQuestion ? (allQuestions[paperForNewQuestion]?.length || 0) : 0
            }
          />
        </>
      )}
    </div>
  );
};
