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
import { AssignRequestItem } from "@/services/assignRequestService";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { UploadProps } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Layout,
  Select,
  Spin,
  Typography
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useEffect, useState } from "react";
import { CreateTemplateForm } from "./LecturerTaskContent/CreateTemplateForm";
import { PaperFormModal } from "./LecturerTaskContent/PaperFormModal";
import { QuestionFormModal } from "./LecturerTaskContent/QuestionFormModal";
import { TaskContentArea } from "./LecturerTaskContent/TaskContentArea";
import { TaskSiderMenu } from "./LecturerTaskContent/TaskSiderMenu";
import { useDataRefresh } from "./LecturerTaskContent/hooks/useDataRefresh";
import { useTemplateOperations } from "./LecturerTaskContent/hooks/useTemplateOperations";
import { beforeUploadPostman, beforeUploadSql } from "./LecturerTaskContent/utils/fileValidation";
import { downloadTemplate, exportTemplate } from "./LecturerTaskContent/utils/templateExportUtils";
import { importTemplate } from "./LecturerTaskContent/utils/templateImportUtils";
import styles from "./Tasks.module.css";
import "./TasksGlobal.css";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;
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

  const [importFileListForNewTemplate, setImportFileListForNewTemplate] = useState<UploadFile[]>([]);
  const [isDatabaseUploadModalOpen, setIsDatabaseUploadModalOpen] = useState(false);
  const [isPostmanUploadModalOpen, setIsPostmanUploadModalOpen] = useState(false);
  const [databaseUploadFileList, setDatabaseUploadFileList] = useState<UploadFile[]>([]);
  const [postmanUploadFileList, setPostmanUploadFileList] = useState<UploadFile[]>([]);

  // Allow editing when status is Pending (1), In Progress (4), or Rejected (3)
  // When Rejected, lecturer can edit template and resubmit
  const isEditable = [1, 3, 4].includes(Number(task.status));
  const isRejected = Number(task.status) === 3;

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

  // Template operations hook
  const templateOperations = useTemplateOperations({
    task,
    lecturerId,
    templates,
    isRejected,
    refetchTemplates,
    notification,
  });

  const {
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
  } = templateOperations;

  // Data refresh hook
  const { refreshPapers, refreshQuestions, refreshFiles } = useDataRefresh({
    templateId: template?.id || null,
    allQuestions,
    setPapers,
    setAllQuestions,
    setFiles,
    resetStatusIfRejected,
  });

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

  const beforeUploadSqlHandler = beforeUploadSql(notification);
  const beforeUploadPostmanHandler = beforeUploadPostman(notification);

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


  const handleDownloadTemplate = async (templateToDownload?: AssessmentTemplate | null) => {
    try {
      await downloadTemplate({
        template: templateToDownload || template,
        task,
        lecturerId,
        papers,
        allQuestions,
        notification,
      });
    } catch (error) {
      // Error already handled in downloadTemplate
    }
  };

  const handleImportTemplate = async (file: File, existingTemplate?: AssessmentTemplate | null) => {
    await importTemplate({
      file,
      existingTemplate: existingTemplate || null,
      task,
      lecturerId,
      templates,
      isRejected,
      notification,
      refetchTemplates,
      fetchAllData,
      resetStatusIfRejected,
    });
  };


  const handleExport = async () => {
    await exportTemplate({
      template,
      papers,
      allQuestions,
      notification,
    });
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
                <TaskSiderMenu
                  selectedKey={selectedKey}
                  papers={papers}
                  allQuestions={allQuestions}
                  isEditable={isCurrentTemplateEditable}
                  onSelect={setSelectedKey}
                  onAddQuestion={openAddQuestionModal}
                  onEditPaper={openEditPaperModal}
                  onDeletePaper={handleDeletePaper}
                  onDeleteQuestion={handleDeleteQuestion}
                />
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
              <TaskContentArea
                selectedKey={selectedKey}
                template={template}
                papers={papers}
                files={files}
                allQuestions={allQuestions}
                isEditable={isCurrentTemplateEditable}
                task={task}
                onFileChange={() => refreshFiles(true)}
                onExport={handleExport}
                onTemplateDelete={() => handleDeleteTemplate(template)}
                onTemplateChange={async () => {
                  await refreshTemplate(true);
                }}
                onPaperChange={() => refreshPapers(true)}
                onQuestionChange={(paperId) => refreshQuestions(paperId, true)}
                onRubricChange={(paperId) => refreshQuestions(paperId, true)}
                onResetStatus={resetStatusIfRejected}
              />
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
