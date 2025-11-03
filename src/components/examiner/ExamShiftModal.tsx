"use client";

import { Alert, DatePicker, Form, Input, Modal, Select } from "antd";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  ExamShift,
  mockCourses,
  mockLecturers,
  mockPapers,
  mockSemesters,
} from "../examiner/mockData";

const { Option } = Select;

interface ExamShiftModalProps {
  open: boolean;
  initialData: ExamShift | null;
  onCancel: () => void;
  onOk: (data: Omit<ExamShift, "id" | "status">) => void;
}

const parseUtcDate = (dateString?: string) => {
  if (!dateString) return null;
  return dayjs(dateString);
};

const ExamShiftModalContent: React.FC<ExamShiftModalProps> = ({
  open,
  initialData,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (open) {
      if (isEditMode) {
        form.setFieldsValue({
          ...initialData,
          startDate: parseUtcDate(initialData.startDate),
          endDate: parseUtcDate(initialData.endDate),
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form, isEditMode]);

  const handleFinish = (values: any) => {
    onOk({
      ...values,
      startDate: values.startDate.toISOString(),
      endDate: values.endDate.toISOString(),
    });
  };

  return (
    <Modal
      title={isEditMode ? "Edit Exam Shift" : "Add Exam Shift"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={isLoading}
      destroyOnHidden
    >
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
          name="name"
          label="Shift Name"
          rules={[{ required: true, message: "Please enter a name" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="paper"
          label="Paper"
          rules={[{ required: true, message: "Please select a paper" }]}
        >
          <Select placeholder="Select paper">
            {mockPapers.map((p) => (
              <Option key={p.id} value={p.name}>
                {p.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="course"
          label="Course"
          rules={[{ required: true, message: "Please select a course" }]}
        >
          <Select placeholder="Select course">
            {mockCourses.map((c) => (
              <Option key={c.id} value={c.name}>
                {c.name} ({c.code})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="semester"
          label="Semester"
          rules={[{ required: true, message: "Please select a semester" }]}
        >
          <Select placeholder="Select semester">
            {mockSemesters.map((s) => (
              <Option key={s.id} value={s.name}>
                {s.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="examiner"
          label="Examiner"
          rules={[{ required: true, message: "Please select an examiner" }]}
        >
          <Select placeholder="Select examiner">
            {mockLecturers.map((l) => (
              <Option key={l.id} value={l.name}>
                {l.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="startDate"
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
          name="endDate"
          label="End Date & Time"
          rules={[{ required: true, message: "Please select an end date" }]}
        >
          <DatePicker
            showTime
            style={{ width: "100%" }}
            format="DD/MM/YYYY HH:mm"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const ExamShiftModal: React.FC<ExamShiftModalProps> = (props) => (
  <ExamShiftModalContent {...props} />
);
