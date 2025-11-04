"use client";

import { Alert, App, DatePicker, Form, Modal, Select, Spin } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

import {
  AssessmentTemplate,
  assessmentTemplateService,
} from "@/services/assessmentTemplateService";
import {
  classService,
  ClassInfo,
  StudentInClass,
} from "@/services/classService";
import { Examiner, examinerService } from "@/services/examinerService";
import {
  CreateExamSessionPayload,
  examSessionService,
} from "@/services/examSessionService";
import { studentManagementService } from "@/services/studentManagementService";
import { Dayjs } from "dayjs";

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

  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInClass[]>([]);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [examiners, setExaminers] = useState<Examiner[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const { notification } = App.useApp();

  useEffect(() => {
    if (!open) return;

    const fetchDependencies = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const [templateData, examinerData, classData] = await Promise.all([
          assessmentTemplateService.getAssessmentTemplates({
            pageNumber: 1,
            pageSize: 1000,
          }),
          examinerService.getExaminerList(),
          classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
        ]);

        setTemplates(templateData.items);
        setExaminers(examinerData);
        setAllClasses(classData.classes);
      } catch (err) {
        console.error("Failed to load modal data:", err);
        setError("Failed to load required data.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchDependencies();
  }, [open]);

  const fetchStudentsForClass = async (classId: number) => {
    try {
      const studentData = await studentManagementService.getStudentsInClass(
        classId
      );
      setStudents(studentData);
    } catch (err) {
      console.error("Failed to fetch students:", err);
      setStudents([]);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchStudentsForClass(selectedClassId);
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);

    const selectedClass = allClasses.find(
      (c) => c.id.toString() === values.classId.toString()
    );

    if (!selectedClass || !selectedClass.semesterCourseId) {
      setError("Selected class data is invalid or missing SemesterCourseId.");
      setIsLoading(false);
      return;
    }

    try {
      const payload: CreateExamSessionPayload = {
        studentIds: values.studentIds,
        semesterCourseId: Number(selectedClass.semesterCourseId),
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
            name="classId"
            label="Class"
            rules={[{ required: true, message: "Please select a class" }]}
          >
            <Select
              placeholder="Select class"
              onChange={setSelectedClassId}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={allClasses.map((c) => ({
                label: `${c.classCode} (${c.courseName})`,
                value: Number(c.id),
              }))}
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
              placeholder="Select students"
              disabled={!selectedClassId}
              options={students.map((s) => ({
                label: `${s.studentName} (${s.studentCode})`,
                value: s.studentId,
              }))}
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
