"use client";

import { Alert, App, DatePicker, Form, Modal, Select, Spin } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState, useMemo } from "react";
import {
  AssessmentTemplate,
  assessmentTemplateService,
} from "@/services/assessmentTemplateService";
import {
  semesterService,
  SemesterPlanDetail,
  SemesterCourse,
  Semester,
  Student,
} from "@/services/semesterService";
import { Examiner, examinerService } from "@/services/examinerService";
import {
  CreateExamSessionPayload,
  examSessionService,
} from "@/services/examSessionService";
import {
  studentManagementService,
  StudentDetail,
} from "@/services/studentManagementService";
import { ClassInfo, classService } from "@/services/classService";

const { Option } = Select;

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

  const [allStudents, setAllStudents] = useState<StudentDetail[]>([]);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [semesters, setSemesters] = useState<SemesterPlanDetail[]>([]);
  const [semesterCourses, setSemesterCourses] = useState<SemesterCourse[]>([]);

  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(
    null
  );
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  const { notification } = App.useApp();

  useEffect(() => {
    if (!open) return;

    const fetchDependencies = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const [templateData, examinerData, studentData, semesterList] =
          await Promise.all([
            assessmentTemplateService.getAssessmentTemplates({
              pageNumber: 1,
              pageSize: 1000,
            }),
            examinerService.getExaminerList(),
            studentManagementService.getStudentList(),
            semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
          ]);

        setTemplates(templateData.items);
        setExaminers(examinerData);
        setAllStudents(studentData);

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
  }, [open, form]);

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

  const studentOptions = useMemo(() => {
    if (!selectedCourseId) return [];

    const semesterCourse = semesterCourses.find(
      (sc) => sc.id === selectedCourseId
    );
    if (!semesterCourse) return [];

    const studentMap = new Map<string, { id: number; name: string }>();

    semesterCourse.classes.forEach((cls) => {
      cls.students.forEach((student) => {
        if (!studentMap.has(student.account.accountCode)) {
          studentMap.set(student.account.accountCode, {
            id: student.id,
            name: student.account.fullName,
          });
        }
      });
    });

    return Array.from(studentMap.entries()).map(([accountCode, data]) => ({
      label: `${data.name} (${accountCode})`,
      value: data.id,
    }));
  }, [selectedCourseId, semesterCourses]);

  const handleSemesterChange = (value: number) => {
    setSelectedSemesterId(value);
    setSelectedCourseId(null);
    form.setFieldsValue({ semesterCourseId: null, studentIds: [] });
  };

  const handleCourseChange = (value: number) => {
    setSelectedCourseId(value);
    form.setFieldsValue({ studentIds: [] });
  };

  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload: CreateExamSessionPayload = {
        studentIds: values.studentIds,
        semesterCourseId: values.semesterCourseId,
        assessmentTemplateId: values.assessmentTemplateId,
        examinerId: values.examinerId,
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
              options={templates.map((t) => ({
                label: t.name,
                value: t.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="studentIds"
            label="Students"
            rules={[{ required: true, message: "Please select students" }]}
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="Select students in this course"
              disabled={!selectedCourseId}
              options={studentOptions}
            />
          </Form.Item>

          <Form.Item
            name="examinerId"
            label="Examiner"
            rules={[{ required: true, message: "Please select an examiner" }]}
          >
            <Select
              placeholder="Select examiner"
              options={examiners.map((l) => ({
                label: `${l.fullName} (${l.accountCode})`,
                value: Number(l.examinerId),
              }))}
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
