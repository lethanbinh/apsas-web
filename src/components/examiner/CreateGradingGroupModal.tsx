"use client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/react-query";
import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { examinerService } from "@/services/examinerService";
import { GradingGroup, gradingGroupService } from "@/services/gradingGroupService";
import { Lecturer } from "@/services/lecturerService";
import { semesterService } from "@/services/semesterService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UploadFile, UploadProps } from "antd";
import {
  Alert,
  App,
  Form,
  Modal,
  Select,
  Typography,
  Upload
} from "antd";
import { useEffect, useMemo, useState } from "react";
const { Text } = Typography;
function isPracticalExamTemplate(
  template: AssessmentTemplate,
  courseElementsMap: Map<number, CourseElement>
): boolean {
  const courseElement = courseElementsMap.get(template.courseElementId);
  return courseElement?.elementType === 2;
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
  const { data: semesterDetail, isLoading: loadingCourses } = useQuery({
    queryKey: ['semesterPlanDetail', selectedSemesterCode],
    queryFn: () => semesterService.getSemesterPlanDetail(selectedSemesterCode!),
    enabled: !!selectedSemesterCode && open,
  });
  const courses = semesterDetail?.semesterCourses || [];
  const { data: allCourseElementsRes = [] } = useQuery({
    queryKey: ['courseElements', 'all'],
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 10000,
    }),
    enabled: open,
  });
  const { data: courseElementsRes = [] } = useQuery({
    queryKey: ['courseElements', 'bySemester', selectedSemesterCode],
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
      semesterCode: selectedSemesterCode!,
    }),
    enabled: !!selectedSemesterCode && open,
  });
  const allCourseElementsMap = useMemo(() => {
    const map = new Map<number, CourseElement>();
    courseElementsMap.forEach((ce, id) => map.set(id, ce));
    allCourseElementsRes.forEach(ce => map.set(ce.id, ce));
    return map;
  }, [courseElementsMap, allCourseElementsRes]);
  const { data: templatesResponse } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: open,
  });
  const assessmentTemplates = useMemo(() => {
    if (!templatesResponse?.items) return [];
    let peTemplates = templatesResponse.items.filter(template =>
      isPracticalExamTemplate(template, allCourseElementsMap)
    );
    if (selectedCourseId && selectedSemesterCode) {
      const courseElementIds = courseElementsRes
        .filter(ce => ce.semesterCourse?.courseId === selectedCourseId)
        .map(ce => ce.id);
      peTemplates = peTemplates.filter(template =>
        courseElementIds.includes(template.courseElementId)
      );
    }
    return peTemplates;
  }, [templatesResponse, selectedCourseId, selectedSemesterCode, courseElementsRes, allCourseElementsMap]);
  const { message: messageApi } = App.useApp();
  const { user } = useAuth();
  const { data: allSemesters = [] } = useQuery({
    queryKey: queryKeys.semesters.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => semesterService.getSemesters({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: open,
  });
  const semesters = useMemo(() => {
    const now = new Date();
    const filtered = allSemesters.filter((sem) => {
      const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
      return startDate <= now;
    });
    return filtered.sort((a, b) => {
      const dateA = new Date(a.startDate.endsWith("Z") ? a.startDate : a.startDate + "Z").getTime();
      const dateB = new Date(b.startDate.endsWith("Z") ? b.startDate : b.startDate + "Z").getTime();
      return dateB - dateA;
    });
  }, [allSemesters]);
  const createGradingGroupMutation = useMutation({
    mutationFn: async (values: any) => {
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
      const group = await gradingGroupService.createGradingGroup({
        lecturerId: values.lecturerId,
        assessmentTemplateId: values.assessmentTemplateId || null,
        createdByExaminerId: currentExaminerId,
      });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroups'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroup'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroupId'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.detail(group.id) });
      messageApi.success("Teacher assigned successfully!");
      onOk();
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
  const getSemesterCodeForTemplate = (templateId: number): string | null => {
    const template = assessmentTemplatesMap.get(templateId);
    if (!template) return null;
    const courseElement = courseElementsMap.get(template.courseElementId);
    return courseElement?.semesterCourse?.semester?.semesterCode || null;
  };
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
      </Form>
    </Modal>
  );
};