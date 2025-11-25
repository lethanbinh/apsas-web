"use client";

import {
  Spin,
  Button,
  Input,
  Radio,
  Space,
  Upload,
  App,
  Modal,
  Form,
  Card,
  List,
  Typography,
  Alert,
  Layout,
  Menu,
  Descriptions,
  Select,
} from "antd";
import { useState, useEffect } from "react";
import styles from "./Tasks.module.css";
import "./TasksGlobal.css";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import {
  AssessmentQuestion,
  assessmentQuestionService,
} from "@/services/assessmentQuestionService";
import {
  AssessmentPaper,
  assessmentPaperService,
} from "@/services/assessmentPaperService";
import { AssignRequestItem, assignRequestService } from "@/services/assignRequestService";
import {
  AssessmentTemplate,
  assessmentTemplateService,
} from "@/services/assessmentTemplateService";
import {
  assessmentFileService,
  AssessmentFile,
} from "@/services/assessmentFileService";
import { gradingService } from "@/services/gradingService";
import { DatabaseOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  PlusOutlined,
  EditOutlined,
  BookOutlined,
  FileTextOutlined,
  InboxOutlined,
  ImportOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadChangeParam } from "antd/es/upload/interface";
import * as XLSX from "xlsx";

const { TextArea } = Input;
const { Sider, Content } = Layout;
const { Title, Text } = Typography;

// --- Component Form Modal cho Rubric ---
const RubricFormModal = ({
  open,
  onCancel,
  onFinish,
  isEditable,
  initialData,
  questionId,
}: {
  open: boolean;
  onCancel: () => void;
  onFinish: () => void;
  isEditable: boolean;
  initialData?: RubricItem;
  questionId?: number;
}) => {
  const [form] = Form.useForm();
  const { notification } = App.useApp();
  const isEditing = !!initialData;
  const title = isEditing ? "Edit Rubric" : "Add New Rubric";

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
      }
    }
  }, [initialData, form, open]);

  const handleSubmit = async (values: any) => {
    try {
      if (isEditing) {
        await rubricItemService.updateRubricItem(initialData!.id, values);
      } else {
        await rubricItemService.createRubricItem({
          ...values,
          assessmentQuestionId: questionId,
        });
      }
      notification.success({
        message: `Rubric ${isEditing ? "updated" : "created"} successfully`,
      });
      onFinish();
    } catch (error) {
      console.error("Failed to save rubric:", error);
      notification.error({ message: "Failed to save rubric" });
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="back" onClick={onCancel}>
          Cancel
        </Button>,
        isEditable ? (
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            {isEditing ? "Save Changes" : "Add Rubric"}
          </Button>
        ) : null,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true }]}
        >
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="input" label="Input">
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="output" label="Output">
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="score" label="Score" rules={[{ required: true }]}>
          <Input type="number" disabled={!isEditable} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// --- Component Form Modal cho Question ---
const QuestionFormModal = ({
  open,
  onCancel,
  onFinish,
  isEditable,
  initialData,
  paperId,
  existingQuestionsCount = 0,
}: {
  open: boolean;
  onCancel: () => void;
  onFinish: () => void;
  isEditable: boolean;
  initialData?: AssessmentQuestion;
  paperId?: number;
  existingQuestionsCount?: number;
}) => {
  const [form] = Form.useForm();
  const { notification } = App.useApp();
  const isEditing = !!initialData;
  const title = isEditing ? "Edit Question" : "Add New Question";

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        // When creating new question, auto-fill questionNumber
        form.resetFields();
        form.setFieldsValue({
          questionNumber: existingQuestionsCount + 1,
        });
      }
    }
  }, [initialData, form, open, existingQuestionsCount]);

  const handleSubmit = async (values: any) => {
    try {
      if (isEditing) {
        await assessmentQuestionService.updateAssessmentQuestion(
          initialData!.id,
          values
        );
      } else {
        await assessmentQuestionService.createAssessmentQuestion({
          ...values,
          assessmentPaperId: paperId,
        });
      }
      notification.success({
        message: `Question ${isEditing ? "updated" : "created"} successfully`,
      });
      onFinish();
    } catch (error) {
      console.error("Failed to save question:", error);
      notification.error({ message: "Failed to save question" });
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      width={700}
      destroyOnHidden
      footer={[
        <Button key="back" onClick={onCancel}>
          Cancel
        </Button>,
        isEditable ? (
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            {isEditing ? "Save Changes" : "Add Question"}
          </Button>
        ) : null,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="questionNumber"
          label="Question Number"
          rules={[{ required: true }]}
        >
          <Input type="number" disabled={!isEditable || !isEditing} />
        </Form.Item>
        <Form.Item
          name="questionText"
          label="Question Text"
          rules={[{ required: true }]}
        >
          <TextArea rows={4} disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="questionSampleInput" label="Sample Input">
          <TextArea rows={4} disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="questionSampleOutput" label="Sample Output">
          <TextArea rows={4} disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="score" label="Score" rules={[{ required: true }]}>
          <Input type="number" disabled={!isEditable} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// --- Component Form Modal cho Paper ---
const PaperFormModal = ({
  open,
  onCancel,
  onFinish,
  isEditable,
  initialData,
  templateId,
}: {
  open: boolean;
  onCancel: () => void;
  onFinish: () => void;
  isEditable: boolean;
  initialData?: AssessmentPaper;
  templateId?: number;
}) => {
  const [form] = Form.useForm();
  const { notification } = App.useApp();
  const isEditing = !!initialData;
  const title = isEditing ? "Edit Paper" : "Add New Paper";

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
          language: initialData.language ?? 0, // Default to 0 (CSharp) if not set
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ language: 0 }); // Default to CSharp for new paper
      }
    }
  }, [initialData, form, open]);

  const handleSubmit = async (values: any) => {
    try {
      if (isEditing) {
        await assessmentPaperService.updateAssessmentPaper(
          initialData!.id,
          values
        );
      } else {
        await assessmentPaperService.createAssessmentPaper({
          ...values,
          assessmentTemplateId: templateId,
        });
      }
      notification.success({
        message: `Paper ${isEditing ? "updated" : "created"} successfully`,
      });
      onFinish();
    } catch (error) {
      console.error("Failed to save paper:", error);
      notification.error({ message: "Failed to save paper" });
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="back" onClick={onCancel}>
          Cancel
        </Button>,
        isEditable ? (
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            {isEditing ? "Save Changes" : "Add Paper"}
          </Button>
        ) : null,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="name" label="Paper Name" rules={[{ required: true }]}>
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="description" label="Paper Description">
          <Input.TextArea rows={3} disabled={!isEditable} />
        </Form.Item>
        <Form.Item 
          name="language" 
          label="Language" 
          rules={[{ required: true, message: "Please select a language" }]}
        >
          <Select disabled={!isEditable}>
            <Select.Option value={0}>CSharp</Select.Option>
            <Select.Option value={1}>C</Select.Option>
            <Select.Option value={2}>Java</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

// --- Component Form Modal cho Template ---
const TemplateFormModal = ({
  open,
  onCancel,
  onFinish,
  isEditable,
  initialData,
  assignedToHODId,
  task,
}: {
  open: boolean;
  onCancel: () => void;
  onFinish: () => void;
  isEditable: boolean;
  initialData?: AssessmentTemplate;
  assignedToHODId?: number;
  task?: AssignRequestItem;
}) => {
  const [form] = Form.useForm();
  const { notification } = App.useApp();
  const isEditing = !!initialData;
  const title = isEditing ? "Edit Assessment Template" : "Add New Template";
  const isRejected = task && Number(task.status) === 3;

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          name: initialData.name,
          description: initialData.description,
          templateType: initialData.templateType,
        });
      } else {
        form.resetFields();
      }
    }
  }, [initialData, form, open]);

  const handleSubmit = async (values: any) => {
    try {
      if (isEditing && initialData && assignedToHODId !== undefined) {
        await assessmentTemplateService.updateAssessmentTemplate(
          initialData.id,
          {
            name: values.name,
            description: values.description,
            templateType: values.templateType,
            assignedToHODId: assignedToHODId,
          }
        );
        
        // If this was a resubmission after rejection, reset status to Pending
        if (isRejected && task) {
          try {
            await assignRequestService.updateAssignRequest(task.id, {
              message: task.message || "Template updated and resubmitted after rejection",
              courseElementId: task.courseElementId,
              assignedLecturerId: task.assignedLecturerId,
              assignedByHODId: task.assignedByHODId,
              status: 1, // Reset to Pending
              assignedAt: task.assignedAt,
            });
            notification.success({
              message: "Template Updated and Resubmitted",
              description: "Template has been updated and status reset to Pending for HOD review.",
            });
          } catch (err: any) {
            console.error("Failed to reset status:", err);
            notification.warning({
              message: "Template Updated",
              description: "Template updated successfully, but failed to reset status. Please contact administrator.",
            });
          }
        } else {
          notification.success({
            message: "Template updated successfully",
          });
        }
      }
      onFinish();
    } catch (error) {
      console.error("Failed to save template:", error);
      notification.error({ message: "Failed to save template" });
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="back" onClick={onCancel}>
          Cancel
        </Button>,
        isEditable ? (
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            {isEditing ? "Save Changes" : "Add Template"}
          </Button>
        ) : null,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Template Name"
          rules={[{ required: true }]}
        >
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="description" label="Template Description">
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item
          name="templateType"
          label="Template Type"
          rules={[{ required: true }]}
        >
          <Radio.Group disabled={!isEditable}>
            <Radio value={0}>DSA</Radio>
            <Radio value={1}>WEBAPI</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
};

// --- Component hiển thị chi tiết Question (cột bên phải) ---
const QuestionDetailView = ({
  question,
  isEditable,
  onRubricChange,
  onQuestionChange,
  onResetStatus,
}: {
  question: AssessmentQuestion;
  isEditable: boolean;
  onRubricChange: () => void;
  onQuestionChange: () => void;
  onResetStatus?: () => Promise<void>;
}) => {
  const [rubrics, setRubrics] = useState<RubricItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedRubric, setSelectedRubric] = useState<RubricItem | undefined>(
    undefined
  );
  const { modal, notification } = App.useApp();

  const fetchRubrics = async () => {
    setIsLoading(true);
    try {
      const response = await rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: question.id,
        pageNumber: 1,
        pageSize: 100,
      });
      setRubrics(response.items);
    } catch (error) {
      console.error("Failed to fetch rubrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRubrics();
  }, [question.id]);

  const openRubricModal = (rubric?: RubricItem) => {
    setSelectedRubric(rubric);
    setIsRubricModalOpen(true);
  };

  const closeRubricModal = () => {
    setIsRubricModalOpen(false);
    setSelectedRubric(undefined);
  };

  const handleRubricFinish = async () => {
    closeRubricModal();
    fetchRubrics();
    onRubricChange(); // Báo cho component cha biết
    if (onResetStatus) {
      await onResetStatus();
    }
  };

  const handleDeleteRubric = (id: number) => {
    modal.confirm({
      title: "Delete this rubric?",
      content: "This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await rubricItemService.deleteRubricItem(id);
          notification.success({ message: "Rubric deleted" });
          handleRubricFinish();
        } catch (error) {
          notification.error({ message: "Failed to delete rubric" });
        }
      },
    });
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Card
        title={<Title level={4}>Question Details</Title>}
        extra={
          isEditable && (
            <Button
              icon={<EditOutlined />}
              onClick={() => setIsQuestionModalOpen(true)}
            >
              Edit Question
            </Button>
          )
        }
      >
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Question Number">
            <Text strong>{question.questionNumber || "N/A"}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Question Text">
            <Text style={{ whiteSpace: "pre-wrap" }}>
              {question.questionText}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Sample Input">
            <Text style={{ whiteSpace: "pre-wrap" }}>
              {question.questionSampleInput}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Sample Output">
            <Text style={{ whiteSpace: "pre-wrap" }}>
              {question.questionSampleOutput}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Score">
            <Text strong>{question.score}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={<Title level={5}>Grading Rubrics</Title>}
        extra={
          isEditable && (
            <Button
              icon={<PlusOutlined />}
              type="dashed"
              onClick={() => openRubricModal()}
            >
              Add Rubric
            </Button>
          )
        }
      >
        {isLoading ? (
          <Spin />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={rubrics}
            renderItem={(rubric) => (
              <List.Item
                actions={
                  isEditable
                    ? [
                        <Button
                          type="link"
                          onClick={() => openRubricModal(rubric)}
                        >
                          Edit
                        </Button>,
                        <Button
                          type="link"
                          danger
                          onClick={() => handleDeleteRubric(rubric.id)}
                        >
                          Delete
                        </Button>,
                      ]
                    : []
                }
              >
                <List.Item.Meta
                  title={rubric.description}
                  description={`Input: ${rubric.input || "N/A"} | Output: ${
                    rubric.output || "N/A"
                  }`}
                />
                <div>
                  <Text strong>{rubric.score} points</Text>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      <RubricFormModal
        open={isRubricModalOpen}
        onCancel={closeRubricModal}
        onFinish={handleRubricFinish}
        isEditable={isEditable}
        initialData={selectedRubric}
        questionId={question.id}
      />

      <QuestionFormModal
        open={isQuestionModalOpen}
        onCancel={() => setIsQuestionModalOpen(false)}
        onFinish={async () => {
          setIsQuestionModalOpen(false);
          onQuestionChange(); // Báo cho component cha biết để refresh
          if (onResetStatus) {
            await onResetStatus();
          }
        }}
        isEditable={isEditable}
        initialData={question}
      />
    </Space>
  );
};

// --- Component hiển thị chi tiết Paper (cột bên phải) ---
const PaperDetailView = ({
  paper,
  isEditable,
  onPaperChange,
  onResetStatus,
}: {
  paper: AssessmentPaper;
  isEditable: boolean;
  onPaperChange: () => void;
  onResetStatus?: () => Promise<void>;
}) => {
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);

  return (
    <Card
      title={<Title level={4}>Paper Details</Title>}
      extra={
        isEditable && (
          <Button
            icon={<EditOutlined />}
            onClick={() => setIsPaperModalOpen(true)}
          >
            Edit Paper
          </Button>
        )
      }
    >
      <Descriptions bordered column={1}>
        <Descriptions.Item label="Paper Name">{paper.name}</Descriptions.Item>
        <Descriptions.Item label="Description">
          {paper.description || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Language">
          {paper.language === 0 ? "CSharp" : paper.language === 1 ? "C" : paper.language === 2 ? "Java" : "N/A"}
        </Descriptions.Item>
      </Descriptions>

      <PaperFormModal
        open={isPaperModalOpen}
        onCancel={() => setIsPaperModalOpen(false)}
        onFinish={async () => {
          setIsPaperModalOpen(false);
          onPaperChange();
          if (onResetStatus) {
            await onResetStatus();
          }
        }}
        isEditable={isEditable}
        initialData={paper}
      />
    </Card>
  );
};

// --- Component hiển thị chi tiết Template (cột bên phải) ---
const TemplateDetailView = ({
  template,
  papers,
  files,
  isEditable,
  onFileChange,
  onExport,
  onTemplateDelete,
  onTemplateChange,
  assignedToHODId,
  task,
  onResetStatus,
  onDownloadTemplate,
  onImportTemplate,
}: {
  template: AssessmentTemplate;
  papers: AssessmentPaper[];
  files: AssessmentFile[];
  isEditable: boolean;
  onFileChange: () => void;
  onExport: () => void;
  onTemplateDelete: () => void;
  onTemplateChange: () => void;
  assignedToHODId?: number;
  task?: AssignRequestItem;
  onResetStatus?: () => Promise<void>;
  onDownloadTemplate?: () => void;
  onImportTemplate?: (file: File) => void;
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const { modal, notification } = App.useApp();

  const handleUploadFile = async () => {
    if (fileList.length === 0) return;
    const uploadPromises = fileList.map((file) => {
      const nativeFile = file.originFileObj as File;
      return assessmentFileService.createAssessmentFile({
        File: nativeFile,
        Name: nativeFile.name,
        FileTemplate: 0,
        AssessmentTemplateId: template.id,
      });
    });

    try {
      await Promise.all(uploadPromises);
      setFileList([]);
      onFileChange();
      notification.success({ message: "Files uploaded successfully" });
    } catch (error: any) {
      notification.error({
        message: "File upload failed",
        description: error.message || "Unknown error",
      });
    }
  };

  const handleDeleteFile = (fileId: number) => {
    modal.confirm({
      title: "Delete this file?",
      content: "This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await assessmentFileService.deleteAssessmentFile(fileId);
          onFileChange();
          notification.success({ message: "File deleted" });
        } catch (error: any) {
          notification.error({ message: "Failed to delete file" });
        }
      },
    });
  };

  const confirmTemplateDelete = () => {
    modal.confirm({
      title: "Delete this template?",
      content: "This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      onOk: onTemplateDelete,
    });
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Card
        title={
          <div style={{ overflow: 'hidden', minWidth: 0, flex: 1 }}>
            <Title 
              level={4} 
              style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                margin: 0,
                maxWidth: '100%'
              }}
            >
              {template.name}
            </Title>
          </div>
        }
      >
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Description">
            {template.description}
          </Descriptions.Item>
          <Descriptions.Item label="Type">
            {template.templateType === 0 ? "DSA" : "WEBAPI"}
          </Descriptions.Item>
          <Descriptions.Item label="Papers">{papers.length}</Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f0f0f0" }}>
          <Space wrap>
            {isEditable && (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setIsTemplateModalOpen(true)}
                >
                  Edit Template
                </Button>
                <Button danger onClick={confirmTemplateDelete}>
                  Delete Template
                </Button>
                {onDownloadTemplate && (
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={onDownloadTemplate}
                  >
                    Download Template
                  </Button>
                )}
                {onImportTemplate && (
                  <Upload
                    fileList={importFileList}
                    beforeUpload={(file) => {
                      setImportFileList([{ uid: "-1", name: file.name, status: "uploading", originFileObj: file }]);
                      onImportTemplate(file);
                      setTimeout(() => {
                        setImportFileList([]);
                      }, 1000);
                      return false;
                    }}
                    accept=".xlsx,.xls"
                    maxCount={1}
                    showUploadList={false}
                  >
                    <Button icon={<ImportOutlined />}>
                      Import Template
                    </Button>
                  </Upload>
                )}
              </>
            )}
            <Button
              icon={<DownloadOutlined />}
              onClick={onExport}
            >
              Export to .docx
            </Button>
          </Space>
        </div>
      </Card>

      <TemplateFormModal
        open={isTemplateModalOpen}
        onCancel={() => setIsTemplateModalOpen(false)}
        onFinish={() => {
          setIsTemplateModalOpen(false);
          onTemplateChange();
        }}
        isEditable={isEditable}
        initialData={template}
        assignedToHODId={assignedToHODId}
        task={task}
      />

      <Card title="Attached Files">
        <List
          dataSource={files}
          renderItem={(file) => (
            <List.Item
              actions={
                isEditable
                  ? [
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteFile(file.id)}
                      />,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                title={
                  <a
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <PaperClipOutlined /> {file.name}
                  </a>
                }
              />
            </List.Item>
          )}
        />
        {isEditable && (
          <Space.Compact style={{ width: "100%", marginTop: "16px" }}>
            <Upload
              fileList={fileList}
              onChange={(info) => setFileList(info.fileList)}
              beforeUpload={() => false}
              multiple={true}
              style={{ flex: 1 }}
            >
              <Button icon={<UploadOutlined />}>Select Files</Button>
            </Upload>
            <Button
              type="primary"
              onClick={handleUploadFile}
              disabled={fileList.length === 0}
            >
              Upload ({fileList.length})
            </Button>
          </Space.Compact>
        )}
      </Card>
    </Space>
  );
};

// --- Component Chính: LecturerTaskContent ---
export const LecturerTaskContent = ({
  task,
  lecturerId,
}: {
  task: AssignRequestItem;
  lecturerId: number;
}) => {
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [template, setTemplate] = useState<AssessmentTemplate | null>(null);
  const [papers, setPapers] = useState<AssessmentPaper[]>([]);
  const [allQuestions, setAllQuestions] = useState<{
    [paperId: number]: AssessmentQuestion[];
  }>({});
  const [files, setFiles] = useState<AssessmentFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>("template-details");

  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [paperForNewQuestion, setPaperForNewQuestion] = useState<
    number | undefined
  >(undefined);
  const [paperToEdit, setPaperToEdit] = useState<AssessmentPaper | null>(null);

  const { modal, notification } = App.useApp();

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [newTemplateType, setNewTemplateType] = useState(0);
  const [databaseFileList, setDatabaseFileList] = useState<UploadFile[]>([]);
  const [postmanFileList, setPostmanFileList] = useState<UploadFile[]>([]);
  const [importFileListForNewTemplate, setImportFileListForNewTemplate] = useState<UploadFile[]>([]);

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

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      // Fetch all templates for this lecturer
      const response = await assessmentTemplateService.getAssessmentTemplates({
        lecturerId: lecturerId,
        pageNumber: 1,
        pageSize: 1000,
      });
      
      // Filter templates by courseElementId (all templates for this course element)
      const courseElementTemplates = response.items.filter(
        (t) => t.courseElementId === task.courseElementId
      );
      
      setTemplates(courseElementTemplates);
      
      // Find template for current assign request (default selected template)
      const currentTemplate = courseElementTemplates.find(
        (t) => t.assignRequestId === task.id
      );
      
      // If found, set it as selected template
      if (currentTemplate) {
        setTemplate(currentTemplate);
        await fetchAllData(currentTemplate.id);
      } else if (courseElementTemplates.length > 0) {
        // If no template for current assign request, use the first one
        setTemplate(courseElementTemplates[0]);
        await fetchAllData(courseElementTemplates[0].id);
      } else {
        // No templates found
        setTemplate(null);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
    fetchTemplates();
  }, [task.id, task.courseElementId, lecturerId]);

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

  // Clear database and postman files if template type is not WEBAPI
  useEffect(() => {
    if (newTemplateType !== 1) {
      setDatabaseFileList([]);
      setPostmanFileList([]);
    }
  }, [newTemplateType]);

  const handleCreateTemplate = async () => {
    try {
      // Validate: Check if there's already a template for this course element
      // If rejected, allow creating a new template or editing existing one
      if (templates.length > 0 && !isRejected) {
        notification.error({
          message: "Template Already Exists",
          description: `This course element already has a template. Only one template is allowed per course element.`,
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
        if (databaseFileList.length === 0) {
          notification.error({
            message: "Database File Required",
            description: "Database file (.sql) is required for WEBAPI templates.",
          });
          return;
        }
        if (postmanFileList.length === 0) {
          notification.error({
            message: "Postman Collection File Required",
            description: "Postman collection file (.postman_collection) is required for WEBAPI templates.",
          });
          return;
        }
      }

      // Create template
      const createdTemplate = await assessmentTemplateService.createAssessmentTemplate({
        name: newTemplateName,
        description: newTemplateDesc,
        templateType: newTemplateType,
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
              await gradingService.uploadPostmanCollectionDatabase(
                0, // template=0 for database
                createdTemplate.id,
                databaseFile
              );
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
              await gradingService.uploadPostmanCollectionDatabase(
                1, // template=1 for postman collection
                createdTemplate.id,
                postmanFile
              );
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
      setDatabaseFileList([]);
      setPostmanFileList([]);
      
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
      
      fetchTemplates();
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
      await fetchTemplates();
      await resetStatusIfRejected();
      notification.success({ message: "Template deleted" });
    } catch (error: any) {
      notification.error({
        message: "Failed to delete template",
        description: error.message || "An unknown error occurred.",
      });
    }
  };

  const handleDownloadTemplate = () => {
    if (!template) {
      notification.warning({ message: "No template selected" });
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Assessment Template
      const templateData = [
        ["ASSESSMENT TEMPLATE"],
        ["Field", "Value", "Description"],
        ["Name", template.name || "", "Template name"],
        ["Description", template.description || "", "Template description"],
        ["Template Type", template.templateType === 0 ? "DSA (0)" : template.templateType === 1 ? "WEBAPI (1)" : template.templateType === 2 ? "Lab (2)" : "Practical Exam (3)", "0: DSA, 1: WEBAPI, 2: Lab, 3: Practical Exam"],
        [],
        ["INSTRUCTIONS:"],
        ["1. Fill in the Name, Description, and Template Type fields above"],
        ["2. Use the Papers sheet to add papers"],
        ["3. Use the Questions sheet to add questions (reference papers by name)"],
        ["4. Use the Rubrics sheet to add rubrics (reference questions by question number)"],
      ];
      const templateWs = XLSX.utils.aoa_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, templateWs, "Assessment Template");

      // Sheet 2: Papers
      const papersData = [
        ["PAPERS"],
        ["Name", "Description", "Language", "Instructions"],
        ["Paper 1", "Description for Paper 1", "CSharp", "Language: CSharp (0), C (1), Java (2)"],
        ["Paper 2", "Description for Paper 2", "C", ""],
        [],
        ["INSTRUCTIONS:"],
        ["- Name: Paper name (required)"],
        ["- Description: Paper description (optional)"],
        ["- Language: CSharp (0), C (1), or Java (2)"],
        ["- Reference papers by name in the Questions sheet"],
      ];
      const papersWs = XLSX.utils.aoa_to_sheet(papersData);
      XLSX.utils.book_append_sheet(wb, papersWs, "Papers");

      // Sheet 3: Questions
      const questionsData = [
        ["QUESTIONS"],
        ["Paper Name", "Question Number", "Question Text", "Sample Input", "Sample Output", "Score", "Instructions"],
        ["Paper 1", 1, "Write a function to calculate factorial", "5", "120", 10, "Paper Name must match a paper from Papers sheet"],
        ["Paper 1", 2, "Write a function to find maximum", "4 9 2", "9", 10, ""],
        ["Paper 2", 1, "Write a function to reverse string", "hello", "olleh", 10, ""],
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
      const questionsWs = XLSX.utils.aoa_to_sheet(questionsData);
      XLSX.utils.book_append_sheet(wb, questionsWs, "Questions");

      // Sheet 4: Rubrics
      const rubricsData = [
        ["RUBRICS"],
        ["Paper Name", "Question Number", "Description", "Input", "Output", "Score", "Instructions"],
        ["Paper 1", 1, "Correct input/output format", "4 9 2", "9", 5, "Paper Name and Question Number must match from Questions sheet"],
        ["Paper 1", 1, "Handles edge cases", "0", "0", 3, ""],
        ["Paper 1", 1, "Code efficiency", "", "", 2, ""],
        ["Paper 1", 2, "Correct input/output format", "5", "120", 5, ""],
        ["Paper 1", 2, "Handles large numbers", "20", "2432902008176640000", 5, ""],
        [],
        ["INSTRUCTIONS:"],
        ["- Paper Name: Must match a paper name from the Papers sheet (required)"],
        ["- Question Number: Must match a question number from the Questions sheet (required)"],
        ["- Description: Rubric description (required)"],
        ["- Input: Test input for this rubric (optional)"],
        ["- Output: Expected output for this input (optional)"],
        ["- Score: Points for this rubric (required)"],
      ];
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

      const fileName = `Assessment_Template_Import_${template.name || "Template"}_${new Date().toISOString().split("T")[0]}.xlsx`;
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
      
      for (let i = 2; i < templateRows.length; i++) {
        const row = templateRows[i];
        if (row && row[0]) {
          if (row[0] === "Name" && row[1]) templateName = String(row[1]).trim();
          if (row[0] === "Description" && row[1]) templateDesc = String(row[1]).trim();
          if (row[0] === "Template Type" && row[1]) {
            const typeStr = String(row[1]);
            if (typeStr.includes("0")) templateType = 0;
            else if (typeStr.includes("1")) templateType = 1;
            else if (typeStr.includes("2")) templateType = 2;
            else if (typeStr.includes("3")) templateType = 3;
          }
        }
      }

      // Validate template name
      if (!templateName) {
        throw new Error("Template name is required in the Assessment Template sheet");
      }

      // Create or update template
      let currentTemplate: AssessmentTemplate;
      if (existingTemplate) {
        // Update existing template if changed
        if (templateName !== existingTemplate.name || templateDesc !== existingTemplate.description || templateType !== existingTemplate.templateType) {
          currentTemplate = await assessmentTemplateService.updateAssessmentTemplate(existingTemplate.id, {
            name: templateName,
            description: templateDesc,
            templateType: templateType,
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
      const paperData: Array<{ name: string; description: string; language: number }> = [];
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
          paperData.push({ name, description, language });
        }
      }

      // Read Questions sheet
      const questionsSheet = workbook.Sheets["Questions"];
      if (!questionsSheet) {
        throw new Error("Questions sheet not found");
      }
      const questionsRows = XLSX.utils.sheet_to_json(questionsSheet, { header: 1 }) as any[][];
      
      // Skip header rows
      const questionData: Array<{
        paperName: string;
        questionNumber: number;
        questionText: string;
        sampleInput: string;
        sampleOutput: string;
        score: number;
      }> = [];
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
            questionData.push({ paperName, questionNumber, questionText, sampleInput, sampleOutput, score });
          }
        }
      }

      // Read Rubrics sheet
      const rubricsSheet = workbook.Sheets["Rubrics"];
      if (!rubricsSheet) {
        throw new Error("Rubrics sheet not found");
      }
      const rubricsRows = XLSX.utils.sheet_to_json(rubricsSheet, { header: 1 }) as any[][];
      
      // Skip header rows
      const rubricData: Array<{
        paperName: string;
        questionNumber: number;
        description: string;
        input: string;
        output: string;
        score: number;
      }> = [];
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
            rubricData.push({ paperName, questionNumber, description, input, output, score });
          }
        }
      }

      // Create papers - using the template ID we just created/updated
      const createdPapers = new Map<string, AssessmentPaper>();
      for (const paper of paperData) {
        try {
          const createdPaper = await assessmentPaperService.createAssessmentPaper({
            name: paper.name,
            description: paper.description,
            assessmentTemplateId: currentTemplate.id, // Use the template ID from creation/update
            language: paper.language,
          });
          createdPapers.set(paper.name, createdPaper);
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
      await fetchTemplates(); // Refresh templates list to get the new/updated template
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
    await fetchTemplates();
    
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
          onDownloadTemplate={handleDownloadTemplate}
          onImportTemplate={(file) => handleImportTemplate(file, template)}
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
          templates.length > 0 && !isRejected ? (
            // If there are templates but current assign request doesn't have one (and not rejected)
            <Alert
              message="Template Already Exists"
              description={`This course element already has ${templates.length} template(s). Only one template is allowed per course element. Please select an existing template or contact the administrator.`}
              type="warning"
              showIcon
            />
          ) : (
            // No template exists, allow creation
            <Card title="No Template Found. Create one.">
              <Form layout="vertical">
                <Form.Item label="Template Name" required>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Enter template name"
                  />
                </Form.Item>
                <Form.Item label="Template Description">
                  <Input
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    placeholder="Enter template description (optional)"
                  />
                </Form.Item>
                <Form.Item label="Template Type" required>
                  <Radio.Group
                    onChange={(e) => setNewTemplateType(e.target.value)}
                    value={newTemplateType}
                  >
                    <Radio value={0}>DSA</Radio>
                    <Radio value={1}>WEBAPI</Radio>
                  </Radio.Group>
                </Form.Item>

                {newTemplateType === 1 && (
                  <>
                    <Form.Item
                      label="Upload Database File (.sql)"
                      required
                      help="Database file is required for WEBAPI templates"
                    >
                      <Space direction="vertical" style={{ width: "100%" }} size="middle">
                        <Card size="small" style={{ backgroundColor: "#fff7e6" }}>
                          <Space direction="vertical" style={{ width: "100%" }} size="small">
                            <Text strong>Upload database SQL file</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Only .sql files are accepted. Maximum size 100MB.
                            </Text>
                          </Space>
                        </Card>
                        <Upload
                          fileList={databaseFileList}
                          beforeUpload={beforeUploadSql}
                          onChange={handleDatabaseFileChange}
                          accept=".sql"
                          maxCount={1}
                        >
                          <Button icon={<DatabaseOutlined />}>Select Database File</Button>
                        </Upload>
                        {databaseFileList.length > 0 && (
                          <Card size="small">
                            <Space>
                              <DatabaseOutlined />
                              <Text>{databaseFileList[0].name}</Text>
                              <Text type="secondary">
                                ({(databaseFileList[0].size! / 1024 / 1024).toFixed(2)} MB)
                              </Text>
                            </Space>
                          </Card>
                        )}
                      </Space>
                    </Form.Item>

                    <Form.Item
                      label="Upload Postman Collection File (.postman_collection)"
                      required
                      help="Postman collection file is required for WEBAPI templates"
                    >
                      <Space direction="vertical" style={{ width: "100%" }} size="middle">
                        <Card size="small" style={{ backgroundColor: "#fff7e6" }}>
                          <Space direction="vertical" style={{ width: "100%" }} size="small">
                            <Text strong>Upload Postman collection file</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Only .postman_collection files are accepted. Maximum size 100MB.
                            </Text>
                          </Space>
                        </Card>
                        <Upload
                          fileList={postmanFileList}
                          beforeUpload={beforeUploadPostman}
                          onChange={handlePostmanFileChange}
                          accept=".postman_collection"
                          maxCount={1}
                        >
                          <Button icon={<DatabaseOutlined />}>Select Postman Collection File</Button>
                        </Upload>
                        {postmanFileList.length > 0 && (
                          <Card size="small">
                            <Space>
                              <DatabaseOutlined />
                              <Text>{postmanFileList[0].name}</Text>
                              <Text type="secondary">
                                ({(postmanFileList[0].size! / 1024 / 1024).toFixed(2)} MB)
                              </Text>
                            </Space>
                          </Card>
                        )}
                      </Space>
                    </Form.Item>
                  </>
                )}

                <Space>
                  <Button 
                    type="primary" 
                    onClick={handleCreateTemplate}
                    disabled={!newTemplateName.trim()}
                  >
                    Create Template
                  </Button>
                  <Upload
                    fileList={importFileListForNewTemplate}
                    beforeUpload={(file) => {
                      setImportFileListForNewTemplate([{ uid: "-1", name: file.name, status: "uploading", originFileObj: file }]);
                      handleImportTemplate(file, null);
                      setTimeout(() => {
                        setImportFileListForNewTemplate([]);
                      }, 1000);
                      return false;
                    }}
                    accept=".xlsx,.xls"
                    maxCount={1}
                    showUploadList={false}
                  >
                    <Button icon={<ImportOutlined />} type="default">
                      Import Template
                    </Button>
                  </Upload>
                </Space>
              </Form>
            </Card>
          )
        ) : (
          <Alert
            message="No template created for this task."
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
