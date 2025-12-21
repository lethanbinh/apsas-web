"use client";

import { DatabaseOutlined, DownloadOutlined, ImportOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Radio, Space, Typography, Upload } from "antd";
import type { RcFile, UploadFile } from "antd/es/upload/interface";
import { UploadFileModal } from "./UploadFileModal";
import styles from "./TaskContent.module.css";

const { Title, Text } = Typography;

interface CreateTemplateFormProps {
  newTemplateName: string;
  newTemplateDesc: string;
  newTemplateType: number;
  newTemplateStartupProject: string;
  databaseFileList: UploadFile[];
  postmanFileList: UploadFile[];
  databaseName: string;
  databaseFileName: string;
  postmanFileName: string;
  importFileListForNewTemplate: UploadFile[];
  isDatabaseUploadModalOpen: boolean;
  isPostmanUploadModalOpen: boolean;
  databaseUploadFileList: UploadFile[];
  postmanUploadFileList: UploadFile[];
  onTemplateNameChange: (value: string) => void;
  onTemplateDescChange: (value: string) => void;
  onTemplateTypeChange: (value: number) => void;
  onStartupProjectChange: (value: string) => void;
  onDatabaseUploadModalOpen: () => void;
  onPostmanUploadModalOpen: () => void;
  onDatabaseUploadModalClose: () => void;
  onPostmanUploadModalClose: () => void;
  onDatabaseUploadFileListChange: (fileList: UploadFile[]) => void;
  onPostmanUploadFileListChange: (fileList: UploadFile[]) => void;
  onDatabaseUploadViaModal: (values: { name: string; databaseName?: string; file: File }) => void;
  onPostmanUploadViaModal: (values: { name: string; databaseName?: string; file: File }) => void;
  onCreateTemplate: () => void;
  onDownloadTemplate: () => void;
  onImportTemplate: (file: File) => void;
}

export const CreateTemplateForm = ({
  newTemplateName,
  newTemplateDesc,
  newTemplateType,
  newTemplateStartupProject,
  databaseFileList,
  postmanFileList,
  databaseName,
  databaseFileName,
  postmanFileName,
  importFileListForNewTemplate,
  isDatabaseUploadModalOpen,
  isPostmanUploadModalOpen,
  databaseUploadFileList,
  postmanUploadFileList,
  onTemplateNameChange,
  onTemplateDescChange,
  onTemplateTypeChange,
  onStartupProjectChange,
  onDatabaseUploadModalOpen,
  onPostmanUploadModalOpen,
  onDatabaseUploadModalClose,
  onPostmanUploadModalClose,
  onDatabaseUploadFileListChange,
  onPostmanUploadFileListChange,
  onDatabaseUploadViaModal,
  onPostmanUploadViaModal,
  onCreateTemplate,
  onDownloadTemplate,
  onImportTemplate,
}: CreateTemplateFormProps) => {
  return (
    <div className={styles.formCard}>
      <Title level={4} className={styles.formTitle}>No Template Found. Create one.</Title>
      <Form layout="vertical">
        <Form.Item label="Template Name" required className={styles.formItem}>
          <Input
            value={newTemplateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            placeholder="Enter template name"
          />
        </Form.Item>
        <Form.Item label="Template Description" className={styles.formItem}>
          <Input
            value={newTemplateDesc}
            onChange={(e) => onTemplateDescChange(e.target.value)}
            placeholder="Enter template description (optional)"
          />
        </Form.Item>
        <Form.Item label="Template Type" required className={styles.formItem}>
          <Radio.Group
            onChange={(e) => onTemplateTypeChange(e.target.value)}
            value={newTemplateType}
            className={styles.radioGroup}
          >
            <Radio value={0}>DSA</Radio>
            <Radio value={1}>WEBAPI</Radio>
          </Radio.Group>
        </Form.Item>

        {newTemplateType === 1 && (
          <Form.Item
            label="Startup Project"
            required
            rules={[{ required: true, message: "Startup Project is required for WEBAPI templates" }]}
            className={styles.formItem}
          >
            <Input
              value={newTemplateStartupProject}
              onChange={(e) => onStartupProjectChange(e.target.value)}
              placeholder="Enter startup project"
            />
          </Form.Item>
        )}

        {newTemplateType === 1 && (
          <>
            <Form.Item
              label="Upload Database File (.sql)"
              required
              help="Database file is required for WEBAPI templates"
              className={styles.formItem}
            >
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Button
                  type="primary"
                  icon={<DatabaseOutlined />}
                  onClick={onDatabaseUploadModalOpen}
                  className={styles.uploadButton}
                >
                  {databaseFileList.length > 0 ? "Edit Database File" : "Upload Database File"}
                </Button>
                {databaseFileList.length > 0 && (
                  <div className={styles.fileUploadCard}>
                    <div className={styles.fileInfo}>
                      <div className={styles.fileInfoRow}>
                        <DatabaseOutlined />
                        <Text className={styles.fileInfoTextStrong}>{databaseFileName || databaseFileList[0].name}</Text>
                      </div>
                      <Text className={styles.fileInfoText}>Database Name: {databaseName}</Text>
                      <Text className={styles.fileInfoText}>
                        File: {databaseFileList[0].name} ({(databaseFileList[0].size! / 1024 / 1024).toFixed(2)} MB)
                      </Text>
                    </div>
                  </div>
                )}
              </Space>
            </Form.Item>

            <Form.Item
              label="Upload Postman Collection File (.postman_collection.json)"
              required
              help="Postman collection file is required for WEBAPI templates"
              className={styles.formItem}
            >
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={onPostmanUploadModalOpen}
                  className={styles.uploadButton}
                >
                  {postmanFileList.length > 0 ? "Edit Postman File" : "Upload Postman File"}
                </Button>
                {postmanFileList.length > 0 && (
                  <div className={styles.fileUploadCard}>
                    <div className={styles.fileInfo}>
                      <div className={styles.fileInfoRow}>
                        <DatabaseOutlined />
                        <Text className={styles.fileInfoTextStrong}>{postmanFileName || postmanFileList[0].name}</Text>
                      </div>
                      <Text className={styles.fileInfoText}>
                        File: {postmanFileList[0].name} ({(postmanFileList[0].size! / 1024 / 1024).toFixed(2)} MB)
                      </Text>
                    </div>
                  </div>
                )}
              </Space>
            </Form.Item>
          </>
        )}

        <div className={styles.actionButtons}>
          <Button
            type="primary"
            onClick={onCreateTemplate}
            disabled={!newTemplateName.trim()}
            className={styles.createButton}
          >
            Create Template
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={onDownloadTemplate}
            className={styles.defaultButton}
          >
            Download Template
          </Button>
          <Upload
            fileList={importFileListForNewTemplate}
            beforeUpload={(file: RcFile) => {
              onImportTemplate(file as File);
              return false;
            }}
            accept=".xlsx,.xls"
            maxCount={1}
            showUploadList={false}
          >
            <Button icon={<ImportOutlined />} className={styles.defaultButton}>
              Import Template
            </Button>
          </Upload>
        </div>
      </Form>

      <UploadFileModal
        open={isDatabaseUploadModalOpen}
        onCancel={onDatabaseUploadModalClose}
        onFinish={onDatabaseUploadViaModal}
        fileType={0}
        templateType={1}
        fileList={databaseUploadFileList}
        onFileListChange={onDatabaseUploadFileListChange}
      />

      <UploadFileModal
        open={isPostmanUploadModalOpen}
        onCancel={onPostmanUploadModalClose}
        onFinish={onPostmanUploadViaModal}
        fileType={1}
        templateType={1}
        fileList={postmanUploadFileList}
        onFileListChange={onPostmanUploadFileListChange}
      />
    </div>
  );
};

