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
}: TemplateDetailViewProps) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFileType, setUploadFileType] = useState<0 | 1 | 2>(2); // 0=Database, 1=Postman, 2=Custom
  const { modal, notification } = App.useApp();

  // Count existing files by type
  const databaseFilesCount = files.filter(f => f.fileTemplate === 0).length;
  const postmanFilesCount = files.filter(f => f.fileTemplate === 1).length;
  const customFilesCount = files.filter(f => f.fileTemplate === 2).length;

  const handleOpenUploadModal = (fileType: 0 | 1 | 2) => {
    // Validate: WEBAPI only allows max 1 database and 1 postman file
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
      
      // For DSA template, always use FileTemplate=2 (Custom)
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
          {template.templateType === 1 && template.startupProject && (
            <Descriptions.Item label="Startup Project">
              {template.startupProject}
            </Descriptions.Item>
          )}
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
        {/* Group files by type for WEBAPI */}
        {template.templateType === 1 ? (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {/* Database Files */}
            <div>
              <Typography.Text strong>Database Files:</Typography.Text>
              <List
                style={{ marginTop: 8 }}
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
                        >
                          <DatabaseOutlined /> {file.name}
                        </a>
                      }
                    />
                  </List.Item>
                )}
              />
              {files.filter(f => f.fileTemplate === 0).length === 0 && (
                <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                  No database files
                </Typography.Text>
              )}
            </div>

            <div>
              <Typography.Text strong>Postman Files:</Typography.Text>
              <List
                style={{ marginTop: 8 }}
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
                        >
                          <PaperClipOutlined /> {file.name}
                        </a>
                      }
                    />
                  </List.Item>
                )}
              />
              {files.filter(f => f.fileTemplate === 1).length === 0 && (
                <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                  No postman files
                </Typography.Text>
              )}
            </div>

            {/* Custom Files */}
            <div>
              <Typography.Text strong>Custom Files:</Typography.Text>
              <List
                style={{ marginTop: 8 }}
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
                        >
                          <PaperClipOutlined /> {file.name}
                        </a>
                      }
                    />
                  </List.Item>
                )}
              />
              {files.filter(f => f.fileTemplate === 2).length === 0 && (
                <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                  No custom files
                </Typography.Text>
              )}
            </div>
          </Space>
        ) : (
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
        )}

        {isEditable && (
          <Space direction="vertical" style={{ width: "100%", marginTop: "16px" }} size="small">
            {template.templateType === 1 ? (
              // WEBAPI: Show buttons for each file type
              <Space wrap>
                <Button
                  icon={<DatabaseOutlined />}
                  onClick={() => handleOpenUploadModal(0)}
                  disabled={databaseFilesCount >= 1}
            >
                  Upload Database File {databaseFilesCount >= 1 ? "(Max 1)" : ""}
                </Button>
            <Button
                  icon={<UploadOutlined />}
                  onClick={() => handleOpenUploadModal(1)}
                  disabled={postmanFilesCount >= 1}
            >
                  Upload Postman File {postmanFilesCount >= 1 ? "(Max 1)" : ""}
            </Button>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => handleOpenUploadModal(2)}
                >
                  Upload Custom File
                </Button>
              </Space>
            ) : (
              // DSA: Only custom files
              <Button
                icon={<UploadOutlined />}
                onClick={() => handleOpenUploadModal(2)}
                block
              >
                Upload Custom File
              </Button>
            )}
          </Space>
        )}
      </Card>

      {/* Upload File Modal */}
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
    </Space>
  );
};

