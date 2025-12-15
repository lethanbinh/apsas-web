"use client";

import { useState } from "react";
import { useQueryClient as useCustomQueryClient } from "@/hooks/useQueryClient";
import { queryKeys } from "@/lib/react-query";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assessmentFileService } from "@/services/assessmentFileService";
import { assignRequestService } from "@/services/assignRequestService";
import type { AssessmentTemplate } from "@/services/assessmentTemplateService";
import type { AssignRequestItem } from "@/services/assignRequestService";
import type { UploadFile } from "antd/es/upload/interface";
import type { NotificationInstance } from "antd/es/notification/interface";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentPaperService } from "@/services/assessmentPaperService";

interface UseTemplateOperationsProps {
  task: AssignRequestItem;
  lecturerId: number;
  templates: AssessmentTemplate[];
  isRejected: boolean;
  refetchTemplates: () => void;
  notification: NotificationInstance;
  allQuestions?: { [paperId: number]: AssessmentQuestion[] };
  templateId?: number | null;
}

export function useTemplateOperations({
  task,
  lecturerId,
  templates,
  isRejected,
  refetchTemplates,
  notification,
  allQuestions,
  templateId,
}: UseTemplateOperationsProps) {
  const queryClient = useCustomQueryClient();
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [newTemplateType, setNewTemplateType] = useState(0);
  const [newTemplateStartupProject, setNewTemplateStartupProject] = useState("");
  const [databaseFileList, setDatabaseFileList] = useState<UploadFile[]>([]);
  const [postmanFileList, setPostmanFileList] = useState<UploadFile[]>([]);
  const [databaseName, setDatabaseName] = useState("");
  const [databaseFileName, setDatabaseFileName] = useState("");
  const [postmanFileName, setPostmanFileName] = useState("");

  const resetStatusIfRejected = async () => {


    console.log("resetStatusIfRejected called:", { isRejected, taskId: task.id, taskStatus: task.status });

    if (!isRejected) {
      console.log("Task is not rejected, skipping status reset check");
      return;
    }

    try {

      const initialKey = `task-${task.id}-initial-commented-questions`;
      const resolvedKey = `task-${task.id}-resolved-questions`;

      let initialQuestionIds: number[] = [];
      let resolvedQuestionIds: number[] = [];

      try {
        const initialStored = localStorage.getItem(initialKey);
        if (initialStored) {
          initialQuestionIds = JSON.parse(initialStored);
        }

        const resolvedStored = localStorage.getItem(resolvedKey);
        if (resolvedStored) {
          resolvedQuestionIds = JSON.parse(resolvedStored);
        }
      } catch (err) {
        console.error("Failed to read from localStorage:", err);
        return;
      }

      console.log("Status reset check from localStorage:", {
        initialCommentedQuestions: initialQuestionIds.length,
        resolvedQuestions: resolvedQuestionIds.length,
        initialQuestionIds,
        resolvedQuestionIds
      });


      if (initialQuestionIds.length === 0) {
        console.log("No initial commented questions stored, skipping status reset");
        return;
      }


      const allResolved = initialQuestionIds.every(questionId =>
        resolvedQuestionIds.includes(questionId)
      );

      if (!allResolved) {
        console.log("Not all comments resolved yet:", {
          missing: initialQuestionIds.filter(id => !resolvedQuestionIds.includes(id))
        });
        return;
      }


      console.log("✅ All comments resolved! Resetting status to Pending...");
      await assignRequestService.updateAssignRequest(task.id, {
        message: task.message || "All questions have been addressed. Status reset to Pending for review.",
        courseElementId: task.courseElementId,
        assignedLecturerId: task.assignedLecturerId,
        assignedByHODId: task.assignedByHODId,
        assignedApproverLecturerId: task.assignedApproverLecturerId ?? 0,
        status: 1,
        assignedAt: task.assignedAt,
      });


      try {
        localStorage.removeItem(initialKey);
        localStorage.removeItem(resolvedKey);
        console.log("Cleared localStorage after status reset");
      } catch (err) {
        console.error("Failed to clear localStorage:", err);
      }

      console.log("Status updated successfully, invalidating queries...");


      await queryClient.invalidateQueries({
        queryKey: queryKeys.assignRequests.byLecturerId(task.assignedLecturerId),
        exact: false
      });

      console.log("✅ Status reset to Pending completed!");

      notification.success({
        message: "Status Reset to Pending",
        description: "All questions have been addressed. Status reset to Pending for HOD review.",
      });
    } catch (err: any) {
      console.error("❌ Failed to reset status:", err);
      notification.warning({
        message: "Content Updated",
        description: "Content updated successfully, but failed to reset status. Please contact administrator.",
      });
    }
  };

  const handleCreateTemplate = async () => {
    try {

      const taskTemplate = templates.find((t) => t.assignRequestId === task.id);
      if (taskTemplate && !isRejected) {
        notification.error({
          message: "Template Already Exists",
          description: `This task already has a template. Please edit the existing template instead.`,
        });
        return;
      }


      if (!newTemplateName.trim()) {
        notification.error({
          message: "Template Name Required",
          description: "Please provide a template name.",
        });
        return;
      }


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


      const createdTemplate = await assessmentTemplateService.createAssessmentTemplate({
        name: newTemplateName,
        description: newTemplateDesc,
        templateType: newTemplateType,
        startupProject: newTemplateType === 1 ? newTemplateStartupProject : undefined,
        assignRequestId: task.id,
        createdByLecturerId: lecturerId,
        assignedToHODId: task.assignedByHODId,
      });


      if (newTemplateType === 1 && createdTemplate.id) {

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
            }
          }
        }


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


      if (isRejected) {
        try {
          await assignRequestService.updateAssignRequest(task.id, {
            message: task.message || "Template resubmitted after rejection",
            courseElementId: task.courseElementId,
            assignedLecturerId: task.assignedLecturerId,
            assignedByHODId: task.assignedByHODId,
            assignedApproverLecturerId: task.assignedApproverLecturerId ?? 0,
            status: 1,
            assignedAt: task.assignedAt,
          });


          await queryClient.invalidateQueries({
            queryKey: queryKeys.assignRequests.byLecturerId(task.assignedLecturerId),
            exact: false
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

  const handleDeleteTemplate = async (template: AssessmentTemplate | null) => {
    if (!template) return;
    try {
      await assessmentTemplateService.deleteAssessmentTemplate(template.id);


      await queryClient.invalidateQueries({
        queryKey: queryKeys.assessmentTemplates.all,
        exact: false
      });


      await queryClient.refetchQueries({
        queryKey: queryKeys.assessmentTemplates.all,
        type: 'active',
      });


      await refetchTemplates();


      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('assessmentTemplatesChanged', {
          detail: { templateId: template.id, action: 'deleted' }
        }));
      }

      await resetStatusIfRejected();
      notification.success({ message: "Template deleted" });
    } catch (error: any) {
      notification.error({
        message: "Failed to delete template",
        description: error.message || "An unknown error occurred.",
      });
    }
  };

  return {
    newTemplateName,
    setNewTemplateName,
    newTemplateDesc,
    setNewTemplateDesc,
    newTemplateType,
    setNewTemplateType,
    newTemplateStartupProject,
    setNewTemplateStartupProject,
    databaseFileList,
    setDatabaseFileList,
    postmanFileList,
    setPostmanFileList,
    databaseName,
    setDatabaseName,
    databaseFileName,
    setDatabaseFileName,
    postmanFileName,
    setPostmanFileName,
    resetStatusIfRejected,
    handleCreateTemplate,
    handleDeleteTemplate,
  };
}

