"use client";

import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { GradingGroup, gradingGroupService } from "@/services/gradingGroupService";
import { Lecturer } from "@/services/lecturerService";
import { Semester, SemesterCourse, SemesterPlanDetail, semesterService } from "@/services/semesterService";
import { submissionService } from "@/services/submissionService";
import { examinerService } from "@/services/examinerService";
import { useAuth } from "@/hooks/useAuth";
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
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";

const { Text } = Typography;

// Helper function to check if an assessment template is a PE (Practical Exam)
// Based on courseElementName, similar to isPracticalExam in student/lecturer pages
function isPracticalExamTemplate(template: AssessmentTemplate): boolean {
  const name = (template.courseElementName || "").toLowerCase();
  const keywords = [
    "exam",
    "pe",
    "practical exam",
    "practical",
    "test",
    "kiểm tra thực hành",
    "thi thực hành",
    "bài thi",
    "bài kiểm tra",
    "thực hành",
  ];
  return keywords.some((keyword) => name.includes(keyword));
}

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
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedSemesterCode, setSelectedSemesterCode] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  // Fetch courses for selected semester
  const { data: semesterDetail, isLoading: loadingCourses } = useQuery({
    queryKey: ['semesterPlanDetail', selectedSemesterCode],
    queryFn: () => semesterService.getSemesterPlanDetail(selectedSemesterCode!),
    enabled: !!selectedSemesterCode && open,
  });

  const courses = semesterDetail?.semesterCourses || [];

  // Fetch course elements for selected semester
  const { data: courseElementsRes = [] } = useQuery({
    queryKey: ['courseElements', 'bySemester', selectedSemesterCode],
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
      semesterCode: selectedSemesterCode!,
    }),
    enabled: !!selectedSemesterCode && open,
  });

  // Fetch all assessment templates
  const { data: templatesResponse } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: open,
  });

  // Filter PE templates based on selected course
  const assessmentTemplates = useMemo(() => {
    if (!templatesResponse?.items) return [];
    let peTemplates = templatesResponse.items.filter(isPracticalExamTemplate);
    
    if (selectedCourseId && selectedSemesterCode) {
      const courseElementIds = courseElementsRes
        .filter(ce => ce.semesterCourse?.courseId === selectedCourseId)
        .map(ce => ce.id);
      peTemplates = peTemplates.filter(template => 
        courseElementIds.includes(template.courseElementId)
      );
    }
    
    return peTemplates;
  }, [templatesResponse, selectedCourseId, selectedSemesterCode, courseElementsRes]);
  const { message: messageApi } = App.useApp();
  const { user } = useAuth();

  // Fetch semesters using TanStack Query
  const { data: allSemesters = [] } = useQuery({
    queryKey: queryKeys.semesters.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => semesterService.getSemesters({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: open,
  });

  // Filter semesters to only show current and future semesters (not past semesters)
  const semesters = useMemo(() => {
    const now = new Date();
    return allSemesters.filter((sem) => {
      const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
      // Only include semesters where endDate >= today (current and future semesters)
      return endDate >= now;
    });
  }, [allSemesters]);

  // Mutation for creating grading group
  const createGradingGroupMutation = useMutation({
    mutationFn: async (values: any) => {
      // Fetch examiner ID from service
      let currentExaminerId: number | null = null;
      
      if (user && user.id) {
        try {
          const examiners = await examinerService.getExaminerList();
          const currentUserAccountId = String(user.id);
          const matchingExaminer = examiners.find(
            (ex) => ex.accountId === String(currentUserAccountId)
          );

          console.log(examiners, currentUserAccountId);
          if (matchingExaminer) {
            currentExaminerId = Number(matchingExaminer.examinerId);
          }
        } catch (err) {
          console.error("Failed to fetch examiner list:", err);
        }
      }

      if (!currentExaminerId) {
        throw new Error("Examiner information not found. Please contact administrator.");
      }

      // Validate duplicate assignment
      if (values.lecturerId && values.assessmentTemplateId) {
        const newSemesterCode = getSemesterCodeForTemplate(values.assessmentTemplateId);

        if (newSemesterCode) {
          const duplicateGroup = existingGroups.find(group => {
            if (group.lecturerId !== Number(values.lecturerId) || group.assessmentTemplateId !== values.assessmentTemplateId) {
              return false;
            }
            const existingSemester = gradingGroupToSemesterMap.get(group.id);
            return existingSemester === newSemesterCode;
          });

          if (duplicateGroup) {
            throw new Error(`This teacher has already been assigned this assessment template for semester ${newSemesterCode}!`);
          }
        }
      }

      // Step 1: Create grading group
      const group = await gradingGroupService.createGradingGroup({
        lecturerId: values.lecturerId,
        assessmentTemplateId: values.assessmentTemplateId || null,
        createdByExaminerId: currentExaminerId,
      });

      // Step 2: Upload ZIP files if provided
      if (fileList.length > 0) {
        const files: File[] = [];
        for (const fileItem of fileList) {
          const file = fileItem.originFileObj;
          if (file) {
            files.push(file);
          }
        }

        if (files.length > 0) {
          await gradingGroupService.addSubmissionsByFile(group.id, {
            Files: files,
          });
        }
      }

      return group;
    },
    onSuccess: (group) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroups'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroup'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroupId'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.detail(group.id) });
      messageApi.success("Teacher assigned successfully!");
      onOk();
      // Refetch queries after 3 seconds
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: queryKeys.grading.groups.all });
        queryClient.refetchQueries({ queryKey: queryKeys.grading.groups.detail(group.id) });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroups'] });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroup', group.id] });
        queryClient.refetchQueries({ queryKey: ['submissions', 'byGradingGroupId', group.id] });
      }, 3000);
    },
    onError: (err: any) => {
      console.error("Failed to assign teacher:", err);
      const errorMsg = err.response?.data?.errorMessages?.[0] || err.message || "Failed to assign teacher.";
      setError(errorMsg);
      messageApi.error(errorMsg);
    },
  });

  useEffect(() => {
    if (open) {
      form.resetFields();
      setFileList([]);
      setError(null);
      setSelectedSemesterCode(null);
      setSelectedCourseId(null);
    }
  }, [open, form]);

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
    setError(null);
    createGradingGroupMutation.mutate(values);
  };

  const isLoading = createGradingGroupMutation.isPending;

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
          name="semesterCode"
          label="Semester"
          rules={[{ required: true, message: "Please select a semester" }]}
        >
          <Select
            showSearch
            placeholder="Select semester"
            allowClear
            onChange={(value) => {
              setSelectedSemesterCode(value);
              setSelectedCourseId(null);
              form.setFieldsValue({ courseId: undefined, assessmentTemplateId: undefined });
            }}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={semesters.map((s) => ({
              label: `${s.semesterCode} (${s.academicYear})`,
              value: s.semesterCode,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="courseId"
          label="Course"
          rules={[{ required: true, message: "Please select a course" }]}
        >
          <Select
            showSearch
            placeholder="Select course"
            allowClear
            loading={loadingCourses}
            disabled={!selectedSemesterCode}
            onChange={(value) => {
              setSelectedCourseId(value);
              form.setFieldsValue({ assessmentTemplateId: undefined });
            }}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={courses.map((sc) => ({
              label: `${sc.course.code} - ${sc.course.name}`,
              value: sc.course.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="assessmentTemplateId"
          label="Assessment Template"
          rules={[{ required: true, message: "Please select an assessment template" }]}
        >
          <Select
            showSearch
            placeholder="Select assessment template"
            allowClear
            loading={false}
            disabled={!selectedCourseId}
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

