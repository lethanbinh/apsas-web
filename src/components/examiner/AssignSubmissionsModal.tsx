"use client";

import {
  GradingGroup,
  GradingGroupSubmission,
  gradingGroupService,
} from "@/services/gradingGroupService";
import { submissionService } from "@/services/submissionService";
import { DeleteOutlined, FileZipOutlined, InboxOutlined } from "@ant-design/icons";
import type { TableProps, UploadFile, UploadProps } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload
} from "antd";
import Dragger from "antd/es/upload/Dragger";
import { useCallback, useEffect, useState } from "react";

const { Title, Text } = Typography;

interface AssignSubmissionsModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  group: GradingGroup;
  allGroups: GradingGroup[];
}

export const AssignSubmissionsModal: React.FC<AssignSubmissionsModalProps> = ({
  open,
  onCancel,
  onOk,
  group,
  allGroups,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [activeTab, setActiveTab] = useState<string>("list");
  const [submissions, setSubmissions] = useState<GradingGroupSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { message: messageApi } = App.useApp();

  const fetchSubmissions = useCallback(async () => {
    if (!group?.id) return;
    
    setLoadingSubmissions(true);
    try {
      // Fetch grading group by ID to get updated submissions
      const updatedGroup = await gradingGroupService.getGradingGroupById(group.id);
      setSubmissions(updatedGroup.submissions || []);
    } catch (err: any) {
      console.error("Failed to fetch submissions:", err);
      messageApi.error("Failed to load submissions");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [group?.id, messageApi]);

  useEffect(() => {
    if (open && group?.id) {
      fetchSubmissions();
      setFileList([]);
      setError(null);
      setActiveTab("list");
      setSelectedRowKeys([]);
    }
  }, [open, group?.id, fetchSubmissions]);

  // Validate file name format: STUXXXXXX.zip (X is digit)
  const validateFileName = (fileName: string): boolean => {
    // Pattern: STU + 6 digits + .zip (case insensitive)
    const pattern = /^STU\d{6}\.zip$/i;
    return pattern.test(fileName);
  };

  // Validate file is ZIP and has correct name format
  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    // Check file extension - must end with .zip
    const fileName = file.name;
    const isZipExtension = fileName.toLowerCase().endsWith(".zip");
    
    if (!isZipExtension) {
      messageApi.error("Only ZIP files are accepted! Please select a file with .zip extension");
      return Upload.LIST_IGNORE;
    }
    
    // Validate file name format: STUXXXXXX.zip
    if (!validateFileName(fileName)) {
      messageApi.error(`Invalid file name format! File name must be in format STUXXXXXX.zip (e.g., STU123456.zip). Current: ${fileName}`);
      return Upload.LIST_IGNORE;
    }
    
    // Check file size (max 100MB)
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      messageApi.error("File must be smaller than 100MB!");
      return Upload.LIST_IGNORE;
    }
    
    return false; // Prevent auto upload
  };

  const handleFileChange: UploadProps["onChange"] = (info) => {
    // Keep all files that pass validation
    const validFiles = info.fileList.filter(file => {
      if (file.status === 'error') return false;
      if (!file.name.toLowerCase().endsWith('.zip')) return false;
      return validateFileName(file.name);
    });
    
    setFileList(validFiles);
  };

  const handleUploadZip = async () => {
    if (fileList.length === 0) {
      messageApi.error("Please select at least one ZIP file!");
      return;
    }

    // Validate all files before upload
    const files: File[] = [];
    const invalidFiles: string[] = [];
    
    for (const fileItem of fileList) {
      const file = fileItem.originFileObj;
      if (!file) {
        invalidFiles.push(fileItem.name || "Unknown file");
        continue;
      }
      
      // Double check validation
      if (!file.name.toLowerCase().endsWith('.zip')) {
        invalidFiles.push(file.name);
        continue;
      }
      
      if (!validateFileName(file.name)) {
        invalidFiles.push(file.name);
        continue;
      }
      
      files.push(file);
    }

    if (invalidFiles.length > 0) {
      messageApi.error(
        `Invalid file(s): ${invalidFiles.join(', ')}. File names must be in format STUXXXXXX.zip (e.g., STU123456.zip)`
      );
      return;
    }

    if (files.length === 0) {
      messageApi.error("No valid files to upload!");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await gradingGroupService.addSubmissionsByFile(group.id, {
        Files: files,
      });

      messageApi.success(
        `Added ${result.createdSubmissionsCount} submissions from ${files.length} file(s) successfully!`,
        5
      );
      await fetchSubmissions();
      setFileList([]);
      onOk(); // Refresh parent component
    } catch (err: any) {
      console.error("Failed to upload files:", err);
      const errorMsg = err.response?.data?.errorMessages?.[0] || err.message || "Failed to upload files. Please try again.";
      setError(errorMsg);
      messageApi.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubmissions = async (submissionIds: number[]) => {
    if (submissionIds.length === 0) {
      messageApi.warning("Please select submissions to delete");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Delete each submission using the DELETE API
      await Promise.all(
        submissionIds.map((id) => submissionService.deleteSubmission(id))
      );

      messageApi.success(`Deleted ${submissionIds.length} submission(s) successfully!`);
      await fetchSubmissions();
      setSelectedRowKeys([]);
      onOk(); // Refresh parent component
    } catch (err: any) {
      console.error("Failed to delete submissions:", err);
      const errorMsg = err.response?.data?.errorMessages?.[0] || err.message || "Failed to delete submissions.";
      setError(errorMsg);
      messageApi.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const submissionColumns: TableProps<GradingGroupSubmission>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Student",
      dataIndex: "studentName",
      key: "student",
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.studentCode}
          </Text>
        </div>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      render: (date) => date ? new Date(date).toLocaleString() : "N/A",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) =>
        status === 0 ? (
          <Tag color="green">On Time</Tag>
        ) : (
          <Tag color="red">Late</Tag>
        ),
    },
    {
      title: "Score",
      dataIndex: "lastGrade",
      key: "score",
      width: 100,
      render: (grade) => <Text>{grade !== null && grade !== undefined ? `${grade}/100` : "N/A"}</Text>,
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  return (
    <Modal
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Manage Submissions - {group.lecturerName}
          </Title>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1000}
      destroyOnHidden
    >
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "list",
            label: "Submissions List",
            children: (
              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text strong>Total: {submissions.length} submissions</Text>
                  {selectedRowKeys.length > 0 && (
                    <Popconfirm
                      title={`Delete ${selectedRowKeys.length} submission(s)`}
                      description="Are you sure you want to delete these submissions?"
                      onConfirm={() => handleDeleteSubmissions(selectedRowKeys.map(Number))}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        loading={isLoading}
                      >
                        Delete Selected ({selectedRowKeys.length})
                      </Button>
                    </Popconfirm>
                  )}
                </div>
                <Table
                  rowSelection={rowSelection}
                  columns={submissionColumns}
                  dataSource={submissions}
                  rowKey="id"
                  loading={loadingSubmissions}
                  pagination={{ pageSize: 10 }}
                  scroll={{ y: 400 }}
                />
              </Space>
            ),
          },
          {
            key: "upload",
            label: (
              <Space>
                <FileZipOutlined />
                <span>Upload ZIP File</span>
              </Space>
            ),
            children: (
              <Space direction="vertical" style={{ width: "100%" }} size="large">
                <Card style={{ backgroundColor: "#f0f9ff" }}>
                  <Space direction="vertical" style={{ width: "100%" }} size="middle">
                    <Text strong>Upload ZIP files containing submissions</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ZIP files will be extracted and submissions will be created automatically. 
                      Only ZIP files are accepted, maximum size 100MB per file.
                      <br />
                      <Text strong style={{ color: "#ff4d4f" }}>
                        File name format: STUXXXXXX.zip (e.g., STU123456.zip) where X is a digit.
                      </Text>
                    </Text>
                  </Space>
                </Card>
                <Dragger
                  fileList={fileList}
                  beforeUpload={beforeUpload}
                  onChange={handleFileChange}
                  accept=".zip,application/zip,application/x-zip-compressed"
                  multiple
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ fontSize: 48, color: "#1890ff" }} />
                  </p>
                  <p className="ant-upload-text">Click or drag ZIP files here</p>
                  <p className="ant-upload-hint">
                    You can select multiple files. File names must be in format STUXXXXXX.zip (e.g., STU123456.zip).
                    Files will be uploaded when you click "Upload".
                  </p>
                </Dragger>
                {fileList.length > 0 && (
                  <Card size="small">
                    <Space direction="vertical" style={{ width: "100%" }} size="small">
                      <Text strong>Selected files ({fileList.length}):</Text>
                      {fileList.map((file, index) => (
                        <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <FileZipOutlined />
                          <Text>{file.name}</Text>
                          <Text type="secondary">
                            ({(file.size! / 1024 / 1024).toFixed(2)} MB)
                          </Text>
                        </div>
                      ))}
                    </Space>
                  </Card>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button onClick={onCancel}>Cancel</Button>
                  <Button
                    type="primary"
                    onClick={handleUploadZip}
                    loading={isLoading}
                    disabled={fileList.length === 0}
                  >
                    Upload
                  </Button>
                </div>
              </Space>
            ),
          },
        ]}
      />
    </Modal>
  );
};
