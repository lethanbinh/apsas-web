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
import { AssignRequestItem } from "@/services/assignRequestService";
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
} from "@ant-design/icons";
import type { UploadFile, UploadChangeParam } from "antd/es/upload/interface";

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
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
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
          <Input disabled={!isEditable} />
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
}: {
  open: boolean;
  onCancel: () => void;
  onFinish: () => void;
  isEditable: boolean;
  initialData?: AssessmentTemplate;
  assignedToHODId?: number;
}) => {
  const [form] = Form.useForm();
  const { notification } = App.useApp();
  const isEditing = !!initialData;
  const title = isEditing ? "Edit Assessment Template" : "Add New Template";

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
        notification.success({
          message: "Template updated successfully",
        });
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
}: {
  question: AssessmentQuestion;
  isEditable: boolean;
  onRubricChange: () => void;
  onQuestionChange: () => void;
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

  const handleRubricFinish = () => {
    closeRubricModal();
    fetchRubrics();
    onRubricChange(); // Báo cho component cha biết
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
        onFinish={() => {
          setIsQuestionModalOpen(false);
          onQuestionChange(); // Báo cho component cha biết để refresh
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
}: {
  paper: AssessmentPaper;
  isEditable: boolean;
  onPaperChange: () => void;
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
          {paper.description}
        </Descriptions.Item>
      </Descriptions>

      <PaperFormModal
        open={isPaperModalOpen}
        onCancel={() => setIsPaperModalOpen(false)}
        onFinish={() => {
          setIsPaperModalOpen(false);
          onPaperChange();
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
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
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
        extra={
          <Space>
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
              </>
            )}
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={onExport}
            >
              Export to .docx
            </Button>
          </Space>
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

  const { modal, notification } = App.useApp();

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");
  const [newTemplateType, setNewTemplateType] = useState(0);
  const [databaseFileList, setDatabaseFileList] = useState<UploadFile[]>([]);
  const [postmanFileList, setPostmanFileList] = useState<UploadFile[]>([]);

  const isEditable = [1, 4].includes(Number(task.status));

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

  const refreshPapers = async () => {
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
    } catch (error) {
      console.error("Failed to refresh papers:", error);
    }
  };

  const refreshQuestions = async (paperId: number) => {
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
    } catch (error) {
      console.error("Failed to refresh questions:", error);
    }
  };

  const refreshFiles = async () => {
    if (!template) return;
    try {
      const fileResponse = await assessmentFileService.getFilesForTemplate({
        assessmentTemplateId: template.id,
        pageNumber: 1,
        pageSize: 100,
      });
      setFiles(fileResponse.items);
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
      if (templates.length > 0) {
        notification.error({
          message: "Template Already Exists",
          description: `This course element already has a template. Only one template is allowed per course element.`,
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
      notification.success({
        message: "Template Created",
        description: "Template has been created successfully.",
      });
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
      notification.success({ message: "Template deleted" });
    } catch (error: any) {
      notification.error({
        message: "Failed to delete template",
        description: error.message || "An unknown error occurred.",
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
          refreshPapers();
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
          refreshQuestions(question.assessmentPaperId);
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

  const refreshTemplate = async () => {
    // Refresh toàn bộ templates và các dữ liệu liên quan
    await fetchTemplates();
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
          onFileChange={refreshFiles}
          onExport={handleExport}
          onTemplateDelete={handleDeleteTemplate}
          onTemplateChange={refreshTemplate}
          assignedToHODId={task.assignedByHODId}
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
            onPaperChange={refreshPapers}
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
            onRubricChange={() => {}} // Có thể refresh tổng điểm sau
            onQuestionChange={() => refreshQuestions(paperId!)}
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
      {!template ? (
        isEditable ? (
          templates.length > 0 ? (
            // If there are templates but current assign request doesn't have one
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

                <Button 
                  type="primary" 
                  onClick={handleCreateTemplate}
                  disabled={!newTemplateName.trim()}
                >
                  Create Template
                </Button>
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
            onCancel={() => setIsPaperModalOpen(false)}
            onFinish={() => {
              setIsPaperModalOpen(false);
              refreshPapers();
            }}
            isEditable={isCurrentTemplateEditable}
            templateId={template.id}
          />
          <QuestionFormModal
            open={isQuestionModalOpen}
            onCancel={() => {
              setIsQuestionModalOpen(false);
              setPaperForNewQuestion(undefined);
            }}
            onFinish={() => {
              setIsQuestionModalOpen(false);
              refreshQuestions(paperForNewQuestion!);
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
