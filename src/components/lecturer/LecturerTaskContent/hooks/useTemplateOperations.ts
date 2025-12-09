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

interface UseTemplateOperationsProps {
  task: AssignRequestItem;
  lecturerId: number;
  templates: AssessmentTemplate[];
  isRejected: boolean;
  refetchTemplates: () => void;
  notification: NotificationInstance;
}

export function useTemplateOperations({
  task,
  lecturerId,
  templates,
  isRejected,
  refetchTemplates,
  notification,
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

  const handleCreateTemplate = async () => {
    try {
      // Validate: Check if there's already a template for this task (not rejected)
      const taskTemplate = templates.find((t) => t.assignRequestId === task.id);
      if (taskTemplate && !isRejected) {
        notification.error({
          message: "Template Already Exists",
          description: `This task already has a template. Please edit the existing template instead.`,
        });
        return;
      }

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

  const handleDeleteTemplate = async (template: AssessmentTemplate | null) => {
    if (!template) return;
    try {
      await assessmentTemplateService.deleteAssessmentTemplate(template.id);
      
      // Invalidate all assessment template queries
      await queryClient.invalidateQueries({ 
        queryKey: queryKeys.assessmentTemplates.all,
        exact: false
      });
      
      // Refetch all assessment template queries immediately
      await queryClient.refetchQueries({
        queryKey: queryKeys.assessmentTemplates.all,
        type: 'active', // Refetch all active queries
      });
      
      // Also refetch local templates
      await refetchTemplates();
      
      // Dispatch custom event to notify other components (after refetch)
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

