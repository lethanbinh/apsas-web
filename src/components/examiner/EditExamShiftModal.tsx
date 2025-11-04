"use client";

import { Alert, App, DatePicker, Form, Input, Modal, Select, Spin } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

import {
  AssessmentTemplate,
  assessmentTemplateService,
} from "@/services/assessmentTemplateService";
import { StudentInClass } from "@/services/classService";
import {
  ExamSession,
  examSessionService,
  UpdateExamSessionPayload,
} from "@/services/examSessionService";
import { studentManagementService } from "@/services/studentManagementService";
import { Dayjs } from "dayjs";

const { Option } = Select;

interface EditExamShiftModalProps {
  open: boolean;
  initialData: ExamSession;
  onCancel: () => void;
  onOk: () => void;
}

const parseUtcDate = (dateString?: string) => {
  if (!dateString) return null;
  return dayjs(dateString.endsWith("Z") ? dateString : dateString + "Z");
};

export const EditExamShiftModal: React.FC<EditExamShiftModalProps> = ({
  open,
  initialData,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentInClass[]>([]);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);

  const { notification } = App.useApp();

  useEffect(() => {
    if (!open) return;

    const fetchDependencies = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const [templateData, studentData] = await Promise.all([
          assessmentTemplateService.getAssessmentTemplates({
            pageNumber: 1,
            pageSize: 1000,
          }),
          studentManagementService.getStudentsInClass(initialData.classId),
        ]);

        setTemplates(templateData.items);
        setStudents(studentData);

        form.setFieldsValue({
          ...initialData,
          classId: initialData.classId,
          assessmentTemplateId: initialData.assessmentTemplateId,
          startAt: parseUtcDate(initialData.startAt),
          endAt: parseUtcDate(initialData.endAt),
          studentIds: studentData.map((s) => s.studentId),
        });
      } catch (err) {
        console.error("Failed to load modal data:", err);
        setError("Failed to load required data.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchDependencies();
  }, [open, initialData, form]);

  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload: UpdateExamSessionPayload = {
        studentIds: values.studentIds,
        assessmentTemplateId: values.assessmentTemplateId,
        startAt: values.startAt.toISOString(),
        endAt: values.endAt.toISOString(),
      };
      await examSessionService.updateExamSession(initialData.id, payload);
      notification.success({ message: "Exam shift updated successfully!" });
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
      title="Edit Exam Shift"
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

          <Form.Item name="classId" label="Class">
            <Input disabled={true} />
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
              options={students.map((s) => ({
                label: `${s.studentName} (${s.studentCode})`,
                value: s.studentId,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="startAt"
            label="Start Date & Time"
            rules={[{ required: true, message: "Please select a start date" }]}
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
