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
import { rubricItemService } from "@/services/rubricItemService";
import { AssignRequestStatus } from "@/types";
import { PlusOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
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
  const isEditable = [
    AssignRequestStatus.PENDING,
    AssignRequestStatus.REJECTED,
    AssignRequestStatus.IN_PROGRESS
  ].includes(Number(task.status));
  const isRejected = Number(task.status) === AssignRequestStatus.REJECTED;
  const isCompleted = Number(task.status) === AssignRequestStatus.COMPLETED;
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
        const sortedQuestions = [...questionResponse.items].sort((a, b) =>
          (a.questionNumber || 0) - (b.questionNumber || 0)
        );
        questionsMap[paper.id] = sortedQuestions;
      }
      setAllQuestions(questionsMap);
      if (isRejected) {
        try {
          const initialKey = `task-${task.id}-initial-commented-questions`;
          const existingInitial = localStorage.getItem(initialKey);
          if (!existingInitial) {
            const allQuestionsFlat: AssessmentQuestion[] = [];
            Object.values(questionsMap).forEach(questions => {
              allQuestionsFlat.push(...questions);
            });
            const questionsWithComments = allQuestionsFlat
              .filter(q => q.reviewerComment && q.reviewerComment.trim())
              .map(q => q.id);
            if (questionsWithComments.length > 0) {
              localStorage.setItem(initialKey, JSON.stringify(questionsWithComments));
              console.log("Initialized localStorage with commented questions:", questionsWithComments);
            }
          }
        } catch (err) {
          console.error("Failed to initialize localStorage:", err);
        }
      }
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
  const { data: templatesResponse, isLoading: isLoadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ lecturerId, courseElementId: task.courseElementId }),
    queryFn: async () => {
      const response = await assessmentTemplateService.getAssessmentTemplates({
        lecturerId: lecturerId,
        pageNumber: 1,
        pageSize: 1000,
      });
      return response.items.filter((t) => t.courseElementId === task.courseElementId);
    },
  });
  const templates = templatesResponse || [];
  const isLoading = isLoadingTemplates;
  const templateOperations = useTemplateOperations({
    task,
    lecturerId,
    templates,
    isRejected,
    refetchTemplates,
    notification,
    allQuestions,
    templateId: template?.id || null,
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
    updateStatusToInProgress,
  } = templateOperations;
  const { refreshPapers, refreshQuestions, refreshFiles } = useDataRefresh({
    templateId: template?.id || null,
    allQuestions,
    setPapers,
    setAllQuestions,
    setFiles,
    resetStatusIfRejected,
  });
  useEffect(() => {
    if (templates.length > 0 && !template) {
      const taskTemplate = templates.find((t) => t.assignRequestId === task.id);
      if (taskTemplate) {
        setTemplate(taskTemplate);
        fetchAllData(taskTemplate.id);
      } else if (templates.length === 1) {
        setTemplate(templates[0]);
        fetchAllData(templates[0].id);
      }
    }
  }, [templates, task.id]);
  useEffect(() => {
    refetchTemplates();
  }, [task.id, task.courseElementId, lecturerId, refetchTemplates]);
  useEffect(() => {
    const handleTemplateChange = async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      queryClient.invalidateQueries({
        queryKey: queryKeys.assessmentTemplates.list({ lecturerId, courseElementId: task.courseElementId }),
      });
      const result = await refetchTemplates();
      const updatedTemplates = result.data || [];
      if (template && !updatedTemplates.find((t) => t.id === template.id)) {
        setTemplate(null);
        setPapers([]);
        setAllQuestions({});
        setFiles([]);
        setSelectedKey("template-details");
      } else if (template) {
        await fetchAllData(template.id);
      }
    };
    window.addEventListener('assessmentTemplatesChanged', handleTemplateChange);
    return () => {
      window.removeEventListener('assessmentTemplatesChanged', handleTemplateChange);
    };
  }, [refetchTemplates, template, task.courseElementId, lecturerId, queryClient, fetchAllData]);
  const handleTemplateChange = async (templateId: number) => {
    const selectedTemplate = templates.find((t) => t.id === templateId);
    if (selectedTemplate) {
      setTemplate(selectedTemplate);
      setSelectedKey("template-details");
      await fetchAllData(selectedTemplate.id);
    }
  };
  const handleDatabaseUploadViaModal = (values: { name: string; databaseName?: string; file: File }) => {
    setDatabaseFileName(values.name);
    setDatabaseName(values.databaseName || "");
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
  const handlePostmanUploadViaModal = (values: { name: string; databaseName?: string; file: File }) => {
    setPostmanFileName(values.name);
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
      updateStatusToInProgress,
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
  const handleDeletePaper = async (paper: AssessmentPaper) => {
    modal.confirm({
      title: `Delete paper: ${paper.name}?`,
      content: "All questions and rubrics inside will also be deleted.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await assessmentPaperService.deleteAssessmentPaper(paper.id);
          notification.success({ message: "Paper deleted" });
          await refreshPapers(true);
          await updateStatusToInProgress();
          setSelectedKey("template-details");
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
          await refreshQuestions(question.assessmentPaperId, true);
          await updateStatusToInProgress();
          setSelectedKey(`paper-${question.assessmentPaperId}`);
        } catch (error) {
          notification.error({ message: "Failed to delete question" });
        }
      },
    });
  };
  const refreshTemplate = async (shouldResetStatus = false) => {
    await refetchTemplates();
    if (shouldResetStatus) {
      await resetStatusIfRejected();
    }
  };
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
          description="This template has been rejected. You can edit the existing template or create a new one. After making changes, the status will be updated to In Progress."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {!template ? (
        isEditable ? (
          (() => {
            const taskTemplate = templates.find((t) => t.assignRequestId === task.id);
            const otherTemplates = templates.filter((t) => t.assignRequestId !== task.id);
            if (otherTemplates.length > 0 && !isRejected && !taskTemplate) {
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
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e8ecf1",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: "calc(100vh - 300px)",
              maxHeight: "calc(100vh - 200px)",
            }}
          >
            <Layout
              style={{
                background: "transparent",
                flex: 1,
                display: "flex",
                flexDirection: "row",
                minHeight: 0,
              }}
            >
              <Sider
                width={380}
                style={{
                  background: "#fafbfc",
                  borderRight: "2px solid #e8ecf1",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    padding: "28px 24px",
                    borderBottom: "2px solid #e8ecf1",
                    flexShrink: 0,
                    background: "#ffffff",
                  }}
                >
                  {templates.length > 1 && (
                    <div style={{ marginBottom: 20 }}>
                      <Text strong style={{ display: "block", marginBottom: 10, fontSize: 14, color: "#2F327D" }}>
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
                    level={4}
                    style={{
                      margin: "0 0 8px 0",
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#2F327D",
                    }}
                  >
                    {template.name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 20 }}>
                    Exam Structure
                  </Text>
                  {template.assignRequestId === task.id && isEditable && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setIsPaperModalOpen(true)}
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 15,
                      }}
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
                <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 0" }}>
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
                  background: "#ffffff",
                  padding: "32px 40px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  flex: 1,
                  minHeight: 0,
                  minWidth: 0,
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
                onFileChange={async () => {
                  await refreshFiles(false);
                  await updateStatusToInProgress();
                }}
                onExport={handleExport}
                onTemplateDelete={() => handleDeleteTemplate(template)}
                onTemplateChange={async () => {
                  await refreshTemplate(false);
                  await updateStatusToInProgress();
                }}
                onPaperChange={async () => {
                  await refreshPapers(false);
                  await updateStatusToInProgress();
                }}
                onQuestionChange={async (paperId) => {
                  await refreshQuestions(paperId, false);
                  await updateStatusToInProgress();
                }}
                onRubricChange={async (paperId) => {
                  await refreshQuestions(paperId, false);
                  await updateStatusToInProgress();
                }}
                onResetStatus={resetStatusIfRejected}
                updateStatusToInProgress={updateStatusToInProgress}
                onConfirmTemplateCreation={async () => {
                  try {
                    const allQuestionsFlat: AssessmentQuestion[] = [];
                    Object.values(allQuestions).forEach(questions => {
                      allQuestionsFlat.push(...questions);
                    });
                    if (allQuestionsFlat.length === 0) {
                      notification.error({
                        message: "Validation Failed",
                        description: "Template must have at least one question.",
                      });
                      return;
                    }
                    const totalQuestionScore = allQuestionsFlat.reduce((sum, q) => sum + (q.score || 0), 0);
                    if (Math.abs(totalQuestionScore - 10) > 0.01) {
                      notification.error({
                        message: "Validation Failed",
                        description: `Total score of all questions must equal 10. Current total: ${totalQuestionScore.toFixed(2)}`,
                      });
                      return;
                    }
                    const validationErrors: string[] = [];
                    for (const question of allQuestionsFlat) {
                      try {
                        const rubricsResponse = await rubricItemService.getRubricsForQuestion({
                          assessmentQuestionId: question.id,
                          pageNumber: 1,
                          pageSize: 100,
                        });
                        const totalRubricScore = rubricsResponse.items.reduce((sum, r) => sum + (r.score || 0), 0);
                        const questionScore = question.score || 0;
                        if (Math.abs(totalRubricScore - questionScore) > 0.01) {
                          validationErrors.push(
                            `Question ${question.questionNumber || question.id}: Total rubric score (${totalRubricScore.toFixed(2)}) does not equal question score (${questionScore.toFixed(2)})`
                          );
                        }
                      } catch (err) {
                        console.error(`Failed to fetch rubrics for question ${question.id}:`, err);
                        validationErrors.push(
                          `Question ${question.questionNumber || question.id}: Failed to validate rubrics`
                        );
                      }
                    }
                    if (validationErrors.length > 0) {
                      notification.error({
                        message: "Validation Failed",
                        description: `The following validation errors were found:\n${validationErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')}`,
                        duration: 10,
                      });
                      return;
                    }
                    modal.confirm({
                      title: "Confirm Template Creation",
                      content: "Once you confirm template creation, the content cannot be edited. Are you sure you want to proceed?",
                      okText: "Yes, Confirm",
                      okType: "primary",
                      cancelText: "Cancel",
                      onOk: async () => {
                        try {
                          await assignRequestService.updateAssignRequest(task.id, {
                            message: task.message || "Template creation confirmed",
                            courseElementId: task.courseElementId,
                            assignedLecturerId: task.assignedLecturerId,
                            assignedByHODId: task.assignedByHODId,
                            assignedApproverLecturerId: task.assignedApproverLecturerId ?? 0,
                            status: 2,
                            assignedAt: task.assignedAt,
                          });
                          await queryClient.invalidateQueries({
                            queryKey: queryKeys.assignRequests.byLecturerId(task.assignedLecturerId),
                            exact: false
                          });
                          notification.success({
                            message: "Template Creation Confirmed",
                            description: "Template has been confirmed and is now ready for approval.",
                          });
                        } catch (err: any) {
                          console.error("Failed to confirm template creation:", err);
                          notification.error({
                            message: "Failed to Confirm",
                            description: err.message || "Failed to confirm template creation.",
                          });
                        }
                      },
                    });
                  } catch (err: any) {
                    console.error("Validation error:", err);
                    notification.error({
                      message: "Validation Error",
                      description: err.message || "An error occurred during validation.",
                    });
                  }
                }}
              />
              </Content>
            </Layout>
          </div>
          {}
          <PaperFormModal
            open={isPaperModalOpen}
            onCancel={() => {
              setIsPaperModalOpen(false);
              setPaperToEdit(null);
            }}
            onFinish={async () => {
              setIsPaperModalOpen(false);
              setPaperToEdit(null);
              await refreshPapers(false);
              await updateStatusToInProgress();
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
            onFinish={async () => {
              setIsQuestionModalOpen(false);
              await refreshQuestions(paperForNewQuestion!, false);
              setPaperForNewQuestion(undefined);
              await updateStatusToInProgress();
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