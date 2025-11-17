"use client";

import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { gradingGroupService, GradingGroup } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import { submissionService } from "@/services/submissionService";
import { Lecturer } from "@/services/lecturerService";
import { courseElementService, CourseElement } from "@/services/courseElementService";
import { FileZipOutlined, InboxOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Modal,
  Select,
  Space,
  Typography,
  Upload,
  Divider
} from "antd";
import Dragger from "antd/es/upload/Dragger";
import { useEffect, useState, useMemo } from "react";

const { Text } = Typography;

interface CreateGradingGroupModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  allLecturers: Lecturer[];
  existingGroups?: GradingGroup[];
  gradingGroupToSemesterMap?: Map<number, string>;
  assessmentTemplatesMap?: Map<number, AssessmentTemplate>;
  courseElementsMap?: Map<number, CourseElement>;
}

export const CreateGradingGroupModal: React.FC<
  CreateGradingGroupModalProps
> = ({
  open,
  onCancel,
  onOk,
  allLecturers,
  existingGroups = [],
  gradingGroupToSemesterMap = new Map(),
  assessmentTemplatesMap = new Map(),
  courseElementsMap = new Map(),
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

  // Get semester code for a given assessment template
  const getSemesterCodeForTemplate = (templateId: number): string | null => {
    const template = assessmentTemplatesMap.get(templateId);
    if (!template) return null;
    
    const courseElement = courseElementsMap.get(template.courseElementId);
    return courseElement?.semesterCourse?.semester?.semesterCode || null;
  };

  // Validate file is ZIP
  const beforeUploadZip: UploadProps["beforeUpload"] = (file) => {
    const fileName = file.name.toLowerCase();
    const isZipExtension = fileName.endsWith(".zip");
    
    if (!isZipExtension) {
      messageApi.error("Only ZIP files are accepted! Please select a file with .zip extension");
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
    // Keep all files that pass validation
    const validFiles = info.fileList.filter(file => {
      if (file.status === 'error') return false;
      if (!file.name.toLowerCase().endsWith('.zip')) return false;
      return true;
    });
    
    setFileList(validFiles);
  };


  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate duplicate assignment: check if lecturer + assessment template + semester already exists
      if (values.lecturerId && values.assessmentTemplateId) {
        const newSemesterCode = getSemesterCodeForTemplate(values.assessmentTemplateId);

        if (newSemesterCode) {
          // Check existing groups for duplicate
          const duplicateGroup = existingGroups.find(group => {
            // Check if same lecturer and same assessment template
            if (group.lecturerId !== Number(values.lecturerId) || group.assessmentTemplateId !== values.assessmentTemplateId) {
              return false;
            }
            
            // Check if same semester
            const existingSemester = gradingGroupToSemesterMap.get(group.id);
            return existingSemester === newSemesterCode;
          });

          if (duplicateGroup) {
            const errorMsg = `This teacher has already been assigned this assessment template for semester ${newSemesterCode}!`;
            setError(errorMsg);
            messageApi.error(errorMsg);
            setIsLoading(false);
            return;
          }
        }
      }

      // Step 1: Create grading group
      const group = await gradingGroupService.createGradingGroup({
        lecturerId: values.lecturerId,
        assessmentTemplateId: values.assessmentTemplateId || null,
      });

      messageApi.success("Teacher assigned successfully!");

      let submissions: any[] = [];
      const submissionZipFiles: File[] = [];

      // Step 2: Upload ZIP files if provided
      if (fileList.length > 0) {
        const files: File[] = [];
        for (const fileItem of fileList) {
          const file = fileItem.originFileObj;
          if (file) {
            files.push(file);
            submissionZipFiles.push(file); // Save ZIP file to use as test file
          }
        }

        if (files.length > 0) {
          const result = await gradingGroupService.addSubmissionsByFile(group.id, {
            Files: files,
          });
          messageApi.success(
            `Added ${result.createdSubmissionsCount} submissions from ${files.length} ZIP file(s)!`,
            5
          );
        }
      }

      // Step 3: Fetch all submissions for this grading group (after ZIP upload if any)
      try {
        submissions = await submissionService.getSubmissionList({
          gradingGroupId: group.id,
        });
      } catch (err) {
        console.error("Failed to fetch submissions:", err);
      }

      // Step 4: Upload test file (the submission ZIP file) for each submission
      // Match ZIP file with submission based on student code in file name
      if (submissionZipFiles.length > 0 && submissions.length > 0) {
        messageApi.info(`Uploading test files for ${submissions.length} submission(s)...`);
        
        // Extract student code from file name (STUXXXXXX.zip -> XXXXXX)
        const extractStudentCode = (fileName: string): string | null => {
          const match = fileName.match(/^STU(\d{6})\.zip$/i);
          return match ? match[1] : null;
        };

        // Create a map of student code to file for quick lookup
        const fileMap = new Map<string, File>();
        submissionZipFiles.forEach(file => {
          const studentCode = extractStudentCode(file.name);
          if (studentCode) {
            fileMap.set(studentCode, file);
          }
        });

        const uploadPromises: Promise<any>[] = [];
        
        // Upload test file for each submission
        for (const submission of submissions) {
          const studentCode = submission.studentCode;
          const testFile = fileMap.get(studentCode);
          
          if (testFile) {
            uploadPromises.push(
              gradingService.uploadTestFile(submission.id, testFile).catch(err => {
                console.error(`Failed to upload test file for submission ${submission.id} (${studentCode}):`, err);
                return null;
              })
            );
          }
        }

        if (uploadPromises.length > 0) {
          const results = await Promise.all(uploadPromises);
          const successCount = results.filter(r => r !== null).length;
          
          if (successCount > 0) {
            messageApi.success(`Test files uploaded for ${successCount}/${uploadPromises.length} submission(s)!`);
          } else {
            messageApi.warning("Failed to upload test files for all submissions.");
          }
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
          label="Assessment Template"
        >
          <Select
            showSearch
            placeholder="Select assessment template"
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
                <Text strong>Upload ZIP files containing submissions</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ZIP files will be extracted and submissions will be created automatically. 
                  Each ZIP file will also be uploaded as test file for the corresponding submission (matched by student code).
                  You can select multiple files. Only ZIP files are accepted, maximum size 100MB per file.
                </Text>
              </Space>
            </Card>
            <Dragger
              fileList={fileList}
              beforeUpload={beforeUploadZip}
              onChange={handleFileChange}
              accept=".zip,application/zip,application/x-zip-compressed"
              multiple
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 48, color: "#1890ff" }} />
              </p>
              <p className="ant-upload-text">Click or drag ZIP files here</p>
              <p className="ant-upload-hint">
                You can select multiple files. Only ZIP files are accepted. Files will be uploaded when you assign the teacher.
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
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
