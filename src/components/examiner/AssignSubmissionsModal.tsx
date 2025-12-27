"use client";
import { queryKeys } from "@/lib/react-query";
import {
  GradingGroup,
  gradingGroupService
} from "@/services/gradingGroupService";
import { FileZipOutlined, InboxOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UploadFile, UploadProps } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Modal,
  Space,
  Typography,
  Upload
} from "antd";
import Dragger from "antd/es/upload/Dragger";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useEffect, useState } from "react";
dayjs.extend(utc);
dayjs.extend(timezone);
const toVietnamTime = (dateString: string | null) => {
  if (!dateString) return null;
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};
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
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const { message: messageApi } = App.useApp();
  useEffect(() => {
    if (open) {
      setFileList([]);
      setError(null);
    }
  }, [open]);
  const validateFileName = (fileName: string): boolean => {
    const pattern = /^STU\d{6}\.zip$/i;
    return pattern.test(fileName);
  };
  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    const fileName = file.name;
    const isZipExtension = fileName.toLowerCase().endsWith(".zip");
    if (!isZipExtension) {
      messageApi.error("Only ZIP files are accepted! Please select a file with .zip extension");
      return Upload.LIST_IGNORE;
    }
    if (!validateFileName(fileName)) {
      messageApi.error(`Invalid file name format! File name must be in format STUXXXXXX.zip (e.g., STU123456.zip). Current: ${fileName}`);
      return Upload.LIST_IGNORE;
    }
    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      messageApi.error("File must be smaller than 100MB!");
      return Upload.LIST_IGNORE;
    }
    return false;
  };
  const handleFileChange: UploadProps["onChange"] = (info) => {
    const validFiles = info.fileList.filter(file => {
      if (file.status === 'error') return false;
      if (!file.name.toLowerCase().endsWith('.zip')) return false;
      return validateFileName(file.name);
    });
    setFileList(validFiles);
  };
  const extractStudentCode = (fileName: string): string | null => {
    const match = fileName.match(/^STU(\d{6})\.zip$/i);
    return match ? match[1] : null;
  };
  const uploadSubmissionsMutation = useMutation({
    mutationFn: async (files: File[]) => {
      return gradingGroupService.addSubmissionsByFile(group.id, {
        Files: files,
      });
    },
    onSuccess: (result, files) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.detail(group.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroups'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroup'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroupId'] });
      messageApi.success(
        `Added ${result.createdSubmissionsCount} submissions from ${files.length} file(s) successfully!`,
        5
      );
      setFileList([]);
      onOk();
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: queryKeys.grading.groups.detail(group.id) });
        queryClient.refetchQueries({ queryKey: queryKeys.grading.groups.all });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroups'] });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroup', group.id] });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroupId', group.id] });
      }, 1000);
    },
    onError: (err: any) => {
      console.error("Failed to upload files:", err);
      const errorMsg = err.response?.data?.errorMessages?.[0] || err.message || "Failed to upload files. Please try again.";
      setError(errorMsg);
      messageApi.error(errorMsg);
    },
  });
  const handleUploadZip = async () => {
    if (fileList.length === 0) {
      messageApi.error("Please select at least one ZIP file!");
      return;
    }
    const files: File[] = [];
    const invalidFiles: string[] = [];
    for (const fileItem of fileList) {
      const file = fileItem.originFileObj;
    if (!file) {
        invalidFiles.push(fileItem.name || "Unknown file");
        continue;
      }
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
    setError(null);
    uploadSubmissionsMutation.mutate(files);
  };
  const isLoading = uploadSubmissionsMutation.isPending;
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
    </Modal>
  );
};