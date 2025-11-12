"use client";

import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { gradingGroupService } from "@/services/gradingGroupService";
import { Lecturer } from "@/services/lecturerService";
import { FileZipOutlined, InboxOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import {
  Alert,
  App,
  Card,
  Form,
  Modal,
  Select,
  Space,
  Typography,
  Upload
} from "antd";
import Dragger from "antd/es/upload/Dragger";
import { useEffect, useState } from "react";

const { Text } = Typography;

interface CreateGradingGroupModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  allLecturers: Lecturer[];
}

export const CreateGradingGroupModal: React.FC<
  CreateGradingGroupModalProps
> = ({
  open,
  onCancel,
  onOk,
  allLecturers,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [assessmentTemplates, setAssessmentTemplates] = useState<AssessmentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    if (open) {
      form.resetFields();
      setFileList([]);
      setError(null);
      fetchAssessmentTemplates();
    }
  }, [open, form]);

  const fetchAssessmentTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      setAssessmentTemplates(response.items);
    } catch (err) {
      console.error("Failed to fetch assessment templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Validate file is ZIP
  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    // Check file extension - must end with .zip
    const fileName = file.name.toLowerCase();
    const isZipExtension = fileName.endsWith(".zip");
    
    if (!isZipExtension) {
      messageApi.error("Only ZIP files are accepted! Please select a file with .zip extension");
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
    let newFileList = [...info.fileList];
    newFileList = newFileList.slice(-1); // Only keep the last file
    setFileList(newFileList);
  };

  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Create grading group
      const group = await gradingGroupService.createGradingGroup({
        lecturerId: values.lecturerId,
        assessmentTemplateId: values.assessmentTemplateId || null,
      });

      messageApi.success("Teacher assigned successfully!");

      // Step 2: Upload ZIP file if provided
      if (fileList.length > 0) {
        const file = fileList[0].originFileObj;
        if (file) {
          const result = await gradingGroupService.addSubmissionsByFile(group.id, {
            Files: [file],
          });
          messageApi.success(
            `Added ${result.createdSubmissionsCount} submissions from ZIP file!`,
            5
          );
        }
      }

      onOk();
    } catch (err: any) {
      console.error("Failed to assign teacher:", err);
      const errorMsg = err.response?.data?.errorMessages?.[0] || err.message || "Failed to assign teacher.";
      setError(errorMsg);
      messageApi.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    setError(null);
    onCancel();
  };

  return (
    <Modal
      title="Assign Teacher"
      open={open}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={isLoading}
      width={700}
      destroyOnHidden
      okText="Assign"
      cancelText="Cancel"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
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

        <Form.Item
          name="lecturerId"
          label="Select Teacher"
          rules={[{ required: true, message: "Please select a teacher" }]}
        >
          <Select
            showSearch
            placeholder="Select teacher"
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={allLecturers.map((l) => ({
              label: `${l.fullName} (${l.accountCode})`,
              value: Number(l.lecturerId),
            }))}
          />
        </Form.Item>

        <Form.Item
          name="assessmentTemplateId"
          label="Assessment Template (Optional)"
        >
          <Select
            showSearch
            placeholder="Select assessment template (optional)"
            allowClear
            loading={loadingTemplates}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={assessmentTemplates.map((t) => ({
              label: `${t.name} - ${t.courseElementName}`,
              value: t.id,
            }))}
          />
        </Form.Item>

        <Form.Item label="Upload Submissions (Optional)">
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Card size="small" style={{ backgroundColor: "#f0f9ff" }}>
              <Space direction="vertical" style={{ width: "100%" }} size="small">
                <Text strong>Upload ZIP file containing submissions</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ZIP file will be extracted and submissions will be created automatically. 
                  Only ZIP files are accepted, maximum size 100MB.
                </Text>
              </Space>
            </Card>
            <Dragger
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={handleFileChange}
              accept=".zip,application/zip,application/x-zip-compressed"
              maxCount={1}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 48, color: "#1890ff" }} />
              </p>
              <p className="ant-upload-text">Click or drag ZIP file here</p>
              <p className="ant-upload-hint">
                Only ZIP files are accepted. File will be uploaded when you assign the teacher.
              </p>
            </Dragger>
            {fileList.length > 0 && (
              <Card size="small">
                <Space>
                  <FileZipOutlined />
                  <Text>{fileList[0].name}</Text>
                  <Text type="secondary">
                    ({(fileList[0].size! / 1024 / 1024).toFixed(2)} MB)
                  </Text>
                </Space>
              </Card>
            )}
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
