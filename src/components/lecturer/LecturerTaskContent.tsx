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

  const isEditable = [1, 3, 4].includes(Number(task.status));
  const isRejected = Number(task.status) === 3;

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
          await refreshPapers(true);
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
          description="This template has been rejected. You can edit the existing template or create a new one. After making changes, the status will be reset to Pending for HOD review."
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
                onFileChange={() => refreshFiles(false)}
                onExport={handleExport}
                onTemplateDelete={() => handleDeleteTemplate(template)}
                onTemplateChange={async () => {
                  await refreshTemplate(false);
                }}
                onPaperChange={() => refreshPapers(false)}
                onQuestionChange={(paperId) => refreshQuestions(paperId, false)}
                onRubricChange={(paperId) => refreshQuestions(paperId, false)}
                onResetStatus={resetStatusIfRejected}
              />
            </Content>
          </Layout>

          {}
          <PaperFormModal
            open={isPaperModalOpen}
            onCancel={() => {
              setIsPaperModalOpen(false);
              setPaperToEdit(null);
            }}
            onFinish={() => {
              setIsPaperModalOpen(false);
              setPaperToEdit(null);
              refreshPapers(false);
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
              refreshQuestions(paperForNewQuestion!, false);
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
