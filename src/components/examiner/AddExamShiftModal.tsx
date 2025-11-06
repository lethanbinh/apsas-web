"use client";

import { useAuth } from "@/hooks/useAuth";
import {
  AssessmentTemplate,
  assessmentTemplateService,
} from "@/services/assessmentTemplateService";
import { examinerService } from "@/services/examinerService";
import {
  CreateExamSessionPayload,
  examSessionService,
} from "@/services/examSessionService";
import {
  SemesterCourse,
  SemesterPlanDetail,
  semesterService,
} from "@/services/semesterService";
import { Alert, App, DatePicker, Form, Modal, Select, Spin } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";

interface AddExamShiftModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
}

export const AddExamShiftModal: React.FC<AddExamShiftModalProps> = ({
  open,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [semesters, setSemesters] = useState<SemesterPlanDetail[]>([]);
  const [semesterCourses, setSemesterCourses] = useState<SemesterCourse[]>([]);
  const [currentExaminerId, setCurrentExaminerId] = useState<number | null>(
    null
  );

  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(
    null
  );
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  const { notification } = App.useApp();
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;

    const fetchDependencies = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const [examinerData, semesterList] = await Promise.all([
          examinerService.getExaminerList(),
          semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
        ]);
        if (user) {
          const loggedInExaminer = examinerData.find(
            (e) => e.accountId === user.id.toString()
          );
          if (loggedInExaminer) {
            setCurrentExaminerId(Number(loggedInExaminer.examinerId));
          } else {
            console.warn("Logged in user is not a registered examiner.");
            setError("Tài khoản của bạn không phải là Examiner.");
          }
        } else {
          setError("Không thể xác thực người dùng.");
        }

        const semesterDetails = await Promise.all(
          semesterList.map((sem) =>
            semesterService.getSemesterPlanDetail(sem.semesterCode)
          )
        );
        setSemesters(semesterDetails);
      } catch (err) {
        console.error("Failed to load modal data:", err);
        setError("Failed to load required data.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchDependencies();
    form.resetFields();
  }, [open, form, user]);

  const fetchTemplatesForSemester = async (semesterId: number) => {
    try {
      const templateData =
        await assessmentTemplateService.getAssessmentTemplates({
          pageNumber: 1,
          pageSize: 1000,
        });
      setTemplates(templateData.items);
    } catch (err) {
      console.error("Failed to fetch templates for semester:", err);
      setTemplates([]);
    }
  };

  const semesterCourseOptions = useMemo(() => {
    if (!selectedSemesterId) return [];
    const semester = semesters.find((s) => s.id === selectedSemesterId);
    setSemesterCourses(semester?.semesterCourses || []);
    return (
      semester?.semesterCourses.map((sc) => ({
        label: `${sc.course.name} (${sc.course.code})`,
        value: sc.id,
      })) || []
    );
  }, [selectedSemesterId, semesters]);

  const templateOptions = useMemo(() => {
    if (!selectedCourseId) return [];
    const courseElementIds =
      semesterCourses
        .find((sc) => sc.id === selectedCourseId)
        ?.courseElements.map((el) => el.id) || [];
    console.log(courseElementIds, templates);
    return templates
      .filter((t) => {
        console.log(t.courseElementId);
        return courseElementIds.includes(t.courseElementId);
      })
      .map((t) => ({
        label: t.name,
        value: t.id,
      }));
  }, [selectedCourseId, templates, semesterCourses]);
  const handleSemesterChange = (value: number) => {
    setSelectedSemesterId(value);
    setSelectedCourseId(null);
    form.setFieldsValue({
      semesterCourseId: null,
      assessmentTemplateId: null,
      studentIds: [],
    });
    if (value) {
      fetchTemplatesForSemester(value);
    } else {
      setTemplates([]);
    }
  };

  const handleCourseChange = (value: number) => {
    setSelectedCourseId(value);
    form.setFieldsValue({ assessmentTemplateId: null, studentIds: [] });
  };

  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);

    if (!currentExaminerId) {
      setError("Không thể xác định Examiner ID. Vui lòng thử lại.");
      setIsLoading(false);
      return;
    }

    try {
      const payload: CreateExamSessionPayload = {
        semesterCourseId: values.semesterCourseId,
        assessmentTemplateId: values.assessmentTemplateId,
        examinerId: currentExaminerId,
        startAt: values.startAt.toISOString(),
        endAt: values.endAt.toISOString(),
      };
      await examSessionService.createExamSession(payload);
      notification.success({ message: "Exam shift created successfully!" });
      onOk();
    } catch (err: any) {
      console.error("Failed to save shift:", err);
      setError(err.message || "Failed to save exam shift.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title="Add Exam Shift"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={isLoading}
      destroyOnHidden
    >
      {isFetching ? (
        <div style={{ textAlign: "center", padding: "30px" }}>
          <Spin />
        </div>
      ) : (
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item
            name="semesterId"
            label="Semester"
            rules={[{ required: true, message: "Please select a semester" }]}
          >
            <Select
              placeholder="Select semester"
              onChange={handleSemesterChange}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={semesters.map((s) => ({
                label: `${s.semesterCode} (${s.academicYear})`,
                value: s.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="semesterCourseId"
            label="Course"
            rules={[{ required: true, message: "Please select a course" }]}
          >
            <Select
              placeholder="Select course"
              disabled={!selectedSemesterId}
              options={semesterCourseOptions}
              onChange={handleCourseChange}
            />
          </Form.Item>

          <Form.Item
            name="assessmentTemplateId"
            label="Paper / Assessment"
            rules={[{ required: true, message: "Please select a paper" }]}
          >
            <Select
              placeholder="Select paper"
              disabled={!selectedCourseId || !selectedCourseId}
              options={templateOptions}
            />
          </Form.Item>
          <Form.Item
            name="startAt"
            label="Start Date & Time"
            rules={[
              { required: true, message: "Please select a start date" },
              () => ({
                validator(_, value: Dayjs) {
                  if (!value) return Promise.resolve();
                  if (value.isBefore(dayjs())) {
                    return Promise.reject(
                      new Error("Start date must be in the future")
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker
              showTime
              style={{ width: "100%" }}
              format="DD/MM/YYYY HH:mm"
            />
          </Form.Item>

          <Form.Item
            name="endAt"
            label="End Date & Time"
            dependencies={["startAt"]}
            rules={[
              { required: true, message: "Please select an end date" },
              ({ getFieldValue }) => ({
                validator(_, value: Dayjs) {
                  const startAt = getFieldValue("startAt");
                  if (!value || !startAt) {
                    return Promise.resolve();
                  }
                  if (value.isBefore(startAt)) {
                    return Promise.reject(
                      new Error("End date must be after start date!")
                    );
                  }
                  const fourHoursInMs = 4 * 60 * 60 * 1000;
                  if (value.diff(startAt) > fourHoursInMs) {
                    return Promise.reject(
                      new Error("Duration cannot exceed 4 hours!")
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker
              showTime
              style={{ width: "100%" }}
              format="DD/MM/YYYY HH:mm"
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};
