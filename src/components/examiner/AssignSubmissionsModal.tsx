"use client";

import {
  GradingGroup,
  GradingGroupSubmission,
  gradingGroupService,
} from "@/services/gradingGroupService";
import { submissionService, Submission } from "@/services/submissionService";
import { assessmentTemplateService, AssessmentTemplate } from "@/services/assessmentTemplateService";
import { DeleteOutlined, FileZipOutlined, InboxOutlined, DownloadOutlined } from "@ant-design/icons";
import type { TableProps, UploadFile, UploadProps } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Divider,
  Form,
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
import { useCallback, useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert UTC to Vietnam time (UTC+7)
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
  const [activeTab, setActiveTab] = useState<string>("list");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { message: messageApi } = App.useApp();

  // Fetch grading group with submissions
  const { data: updatedGroup, isLoading: loadingSubmissions } = useQuery({
    queryKey: queryKeys.grading.groups.detail(group.id),
    queryFn: () => gradingGroupService.getGradingGroupById(group.id),
    enabled: open && !!group?.id,
  });

  // Get submission IDs from grading group
  const submissionIds = useMemo(() => {
    return (updatedGroup?.submissions || []).map(s => s.id);
  }, [updatedGroup]);

  // Fetch full submission details with submissionFile
  const { data: fullSubmissionsData = [] } = useQuery({
    queryKey: ['submissions', 'byGradingGroup', group.id],
    queryFn: () => submissionService.getSubmissionList({
      gradingGroupId: group.id,
    }),
    enabled: open && !!group?.id,
  });

  // Map submissions with full details
  const submissions = useMemo(() => {
    if (fullSubmissionsData.length > 0) {
      return fullSubmissionsData;
    }
    // Fallback to basic submissions from grading group if full data not available
    return (updatedGroup?.submissions || []).map(gSub => ({
      id: gSub.id,
      studentId: gSub.studentId,
      studentName: gSub.studentName,
      studentCode: gSub.studentCode,
      gradingGroupId: gSub.gradingGroupId,
      submittedAt: gSub.submittedAt || "",
      status: gSub.status,
      lastGrade: gSub.lastGrade,
      submissionFile: null, // Will be null if not fetched
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Submission));
  }, [fullSubmissionsData, updatedGroup]);

  // Fetch assessment template
  const { data: templatesResponse } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
            pageNumber: 1,
            pageSize: 1000,
    }),
    enabled: open && !!updatedGroup?.assessmentTemplateId,
  });

  const assessmentTemplate = useMemo(() => {
    if (!updatedGroup?.assessmentTemplateId || !templatesResponse?.items) return null;
    return templatesResponse.items.find(t => t.id === updatedGroup.assessmentTemplateId) || null;
  }, [updatedGroup, templatesResponse]);

  useEffect(() => {
    if (open) {
      setFileList([]);
      setError(null);
      setActiveTab("list");
      setSelectedRowKeys([]);
    }
  }, [open]);

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

  // Extract student code from file name (STUXXXXXX.zip -> XXXXXX)
  const extractStudentCode = (fileName: string): string | null => {
    const match = fileName.match(/^STU(\d{6})\.zip$/i);
    return match ? match[1] : null;
  };

  // Mutation for uploading submissions
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
      // Refetch queries after 3 seconds
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: queryKeys.grading.groups.detail(group.id) });
        queryClient.refetchQueries({ queryKey: queryKeys.grading.groups.all });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroups'] });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroup', group.id] });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroupId', group.id] });
      }, 3000);
    },
    onError: (err: any) => {
      console.error("Failed to upload files:", err);
      const errorMsg = err.response?.data?.errorMessages?.[0] || err.message || "Failed to upload files. Please try again.";
      setError(errorMsg);
      messageApi.error(errorMsg);
    },
  });

  // Mutation for deleting submissions
  const deleteSubmissionsMutation = useMutation({
    mutationFn: async (submissionIds: number[]) => {
      await Promise.all(
        submissionIds.map((id) => submissionService.deleteSubmission(id))
      );
    },
    onSuccess: (_, submissionIds) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.detail(group.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroups'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroup'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroupId'] });
      messageApi.success(`Deleted ${submissionIds.length} submission(s) successfully!`);
      setSelectedRowKeys([]);
      onOk();
      // Refetch queries after 3 seconds
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: queryKeys.grading.groups.detail(group.id) });
        queryClient.refetchQueries({ queryKey: queryKeys.grading.groups.all });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroups'] });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroup', group.id] });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroupId', group.id] });
      }, 3000);
    },
    onError: (err: any) => {
      console.error("Failed to delete submissions:", err);
      const errorMsg = err.response?.data?.errorMessages?.[0] || err.message || "Failed to delete submissions.";
      setError(errorMsg);
      messageApi.error(errorMsg);
    },
  });

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

    setError(null);
    uploadSubmissionsMutation.mutate(files);
  };

  const handleDeleteSubmissions = async (submissionIds: number[]) => {
    if (submissionIds.length === 0) {
      messageApi.warning("Please select submissions to delete");
      return;
    }

    setError(null);
    deleteSubmissionsMutation.mutate(submissionIds);
  };

  const isLoading = uploadSubmissionsMutation.isPending || deleteSubmissionsMutation.isPending;

  const submissionColumns: TableProps<Submission>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      align: "center",
    },
    {
      title: "Student",
      dataIndex: "studentName",
      key: "student",
      render: (name, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.studentCode}
          </Text>
        </div>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 120,
      align: "center",
      render: (_, record) => {
        const handleDownload = () => {
          if (record.submissionFile?.submissionUrl) {
            const link = document.createElement("a");
            link.href = record.submissionFile.submissionUrl;
            link.download = record.submissionFile.name || "submission.zip";
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        };

        return (
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={!record.submissionFile?.submissionUrl}
            size="small"
          >
            Download
          </Button>
        );
      },
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
                    <Space>
                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => {
                          const selectedSubmissions = submissions.filter(s => selectedRowKeys.includes(s.id));
                          const submissionsWithFiles = selectedSubmissions.filter(s => s.submissionFile?.submissionUrl);
                          
                          if (submissionsWithFiles.length === 0) {
                            messageApi.warning("No submissions with files selected");
                            return;
                          }

                          // Download each file
                          submissionsWithFiles.forEach((sub) => {
                            if (sub.submissionFile?.submissionUrl) {
                              const link = document.createElement("a");
                              link.href = sub.submissionFile.submissionUrl;
                              link.download = sub.submissionFile.name || `submission_${sub.id}.zip`;
                              link.target = "_blank";
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }
                          });
                          
                          messageApi.success(`Downloading ${submissionsWithFiles.length} file(s)...`);
                        }}
                      >
                        Download Selected ({selectedRowKeys.length})
                      </Button>
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
                    </Space>
                  )}
                </div>
                <Card>
                  <Table
                    rowSelection={rowSelection}
                    columns={submissionColumns}
                    dataSource={submissions}
                    rowKey="id"
                    loading={loadingSubmissions}
                    pagination={{ 
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `Total ${total} submissions`,
                    }}
                    scroll={{ y: 400 }}
                    size="middle"
                  />
                </Card>
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
