"use client";
import { AssessmentFile, assessmentFileService } from "@/services/assessmentFileService";
import { AssessmentPaper } from "@/services/assessmentPaperService";
import { AssessmentTemplate } from "@/services/assessmentTemplateService";
import { AssignRequestItem } from "@/services/assignRequestService";
import { DatabaseOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, ImportOutlined, PaperClipOutlined, UploadOutlined } from "@ant-design/icons";
import { App, Button, Card, Descriptions, List, Space, Typography, Upload } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useState } from "react";
import { TemplateFormModal } from "./TemplateFormModal";
import { UploadFileModal } from "./UploadFileModal";
import styles from "./TaskContent.module.css";
const { Title } = Typography;
interface TemplateDetailViewProps {
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
  onConfirmTemplateCreation?: () => Promise<void>;
  updateStatusToInProgress?: () => Promise<void>;
}
export const TemplateDetailView = ({
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
  onConfirmTemplateCreation,
  updateStatusToInProgress,
}: TemplateDetailViewProps) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFileType, setUploadFileType] = useState<0 | 1 | 2>(2);
  const { modal, notification } = App.useApp();
  const databaseFilesCount = files.filter(f => f.fileTemplate === 0).length;
  const postmanFilesCount = files.filter(f => f.fileTemplate === 1).length;
  const customFilesCount = files.filter(f => f.fileTemplate === 2).length;
  const handleOpenUploadModal = (fileType: 0 | 1 | 2) => {
    if (template.templateType === 1) {
      if (fileType === 0 && databaseFilesCount >= 1) {
        notification.warning({
          message: "Maximum limit reached",
          description: "Only 1 database file is allowed for WEBAPI templates.",
        });
        return;
      }
      if (fileType === 1 && postmanFilesCount >= 1) {
        notification.warning({
          message: "Maximum limit reached",
          description: "Only 1 postman file is allowed for WEBAPI templates.",
        });
        return;
      }
    }
    setUploadFileType(fileType);
    setIsUploadModalOpen(true);
  };
  const handleUploadFile = async (values: { name: string; databaseName?: string; file: File }) => {
    try {
      let fileTemplate = uploadFileType;
      if (template.templateType === 0) {
        fileTemplate = 2;
      }
      await assessmentFileService.createAssessmentFile({
        File: values.file,
        Name: values.name,
        DatabaseName: fileTemplate === 0 ? values.databaseName : undefined,
        FileTemplate: fileTemplate,
        AssessmentTemplateId: template.id,
      });
      setIsUploadModalOpen(false);
      setFileList([]);
      onFileChange();
      if (updateStatusToInProgress) {
        await updateStatusToInProgress();
      }
      notification.success({ message: "File uploaded successfully" });
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
          if (updateStatusToInProgress) {
            await updateStatusToInProgress();
          }
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
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Title level={4} className={styles.cardTitle} style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {template.name}
          </Title>
        </div>
        <div className={styles.cardBody}>
          <Descriptions bordered column={1} className={styles.descriptions}>
            <Descriptions.Item label="Description">
              {template.description}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              {template.templateType === 0 ? "DSA" : "WEBAPI"}
            </Descriptions.Item>
            {template.templateType === 1 && template.startupProject && (
              <Descriptions.Item label="Startup Project">
                {template.startupProject}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Papers">{papers.length}</Descriptions.Item>
          </Descriptions>
          <div className={styles.buttonGroup}>
            {isEditable && (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setIsTemplateModalOpen(true)}
                  className={styles.button}
                >
                  Edit Template
                </Button>
                <Button danger onClick={confirmTemplateDelete} className={styles.button}>
                  Delete Template
                </Button>
                {onDownloadTemplate && (
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={onDownloadTemplate}
                    className={styles.button}
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
                    <Button icon={<ImportOutlined />} className={styles.button}>
                      Import Template
                    </Button>
                  </Upload>
                )}
              </>
            )}
            <Button
              icon={<DownloadOutlined />}
              onClick={onExport}
              className={styles.button}
            >
              Export to .docx
            </Button>
            {onConfirmTemplateCreation && task && task.status === 4 && (
              <Button
                type="primary"
                onClick={onConfirmTemplateCreation}
                className={`${styles.button} ${styles.primaryButton}`}
              >
                Confirm Template Creation
              </Button>
            )}
          </div>
        </div>
      </div>
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
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Title level={4} className={styles.cardTitle} style={{ margin: 0 }}>Attached Files</Title>
        </div>
        <div className={styles.cardBody}>
          {template.templateType === 1 ? (
            <Space direction="vertical" style={{ width: "100%" }} size="large">
              <div className={styles.fileSection}>
                <Typography.Text strong className={styles.fileSectionTitle}>Database Files:</Typography.Text>
                <List
                  className={styles.fileList}
                  dataSource={files.filter(f => f.fileTemplate === 0)}
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
                            className={styles.fileLink}
                          >
                            <DatabaseOutlined /> {file.name}
                          </a>
                        }
                      />
                    </List.Item>
                  )}
                />
                {files.filter(f => f.fileTemplate === 0).length === 0 && (
                  <Typography.Text type="secondary" className={styles.emptyFileText}>
                    No database files
                  </Typography.Text>
                )}
              </div>
              <div className={styles.fileSection}>
                <Typography.Text strong className={styles.fileSectionTitle}>Postman Files:</Typography.Text>
                <List
                  className={styles.fileList}
                  dataSource={files.filter(f => f.fileTemplate === 1)}
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
                            className={styles.fileLink}
                          >
                            <PaperClipOutlined /> {file.name}
                          </a>
                        }
                      />
                    </List.Item>
                  )}
                />
                {files.filter(f => f.fileTemplate === 1).length === 0 && (
                  <Typography.Text type="secondary" className={styles.emptyFileText}>
                    No postman files
                  </Typography.Text>
                )}
              </div>
              <div className={styles.fileSection}>
                <Typography.Text strong className={styles.fileSectionTitle}>Custom Files:</Typography.Text>
                <List
                  className={styles.fileList}
                  dataSource={files.filter(f => f.fileTemplate === 2)}
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
                            className={styles.fileLink}
                          >
                            <PaperClipOutlined /> {file.name}
                          </a>
                        }
                      />
                    </List.Item>
                  )}
                />
                {files.filter(f => f.fileTemplate === 2).length === 0 && (
                  <Typography.Text type="secondary" className={styles.emptyFileText}>
                    No custom files
                  </Typography.Text>
                )}
              </div>
            </Space>
          ) : (
            <List
              className={styles.fileList}
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
                        className={styles.fileLink}
                      >
                        <PaperClipOutlined /> {file.name}
                      </a>
                    }
                  />
                </List.Item>
              )}
            />
          )}
          {isEditable && (
            <div className={styles.uploadButtonGroup}>
              {template.templateType === 1 ? (
                <>
                  <Button
                    icon={<DatabaseOutlined />}
                    onClick={() => handleOpenUploadModal(0)}
                    disabled={databaseFilesCount >= 1}
                    className={styles.uploadButton}
                  >
                    Upload Database File {databaseFilesCount >= 1 ? "(Max 1)" : ""}
                  </Button>
                  <Button
                    icon={<UploadOutlined />}
                    onClick={() => handleOpenUploadModal(1)}
                    disabled={postmanFilesCount >= 1}
                    className={styles.uploadButton}
                  >
                    Upload Postman File {postmanFilesCount >= 1 ? "(Max 1)" : ""}
                  </Button>
                  <Button
                    icon={<UploadOutlined />}
                    onClick={() => handleOpenUploadModal(2)}
                    className={styles.uploadButton}
                  >
                    Upload Custom File
                  </Button>
                </>
              ) : (
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => handleOpenUploadModal(2)}
                  block
                  className={styles.uploadButton}
                >
                  Upload Custom File
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      <UploadFileModal
        open={isUploadModalOpen}
        onCancel={() => {
          setIsUploadModalOpen(false);
          setFileList([]);
        }}
        onFinish={handleUploadFile}
        fileType={uploadFileType}
        templateType={template.templateType}
        fileList={fileList}
        onFileListChange={setFileList}
      />
    </div>
  );
};