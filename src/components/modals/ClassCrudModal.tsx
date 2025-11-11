"use client";

import { Modal, Form, Input, Spin, Alert, App, Select } from "antd";
import { useEffect, useState } from "react";

import {
  classManagementService,
  CreateClassPayload,
  UpdateClassPayload,
} from "@/services/classManagementService";
import { Lecturer, lecturerService } from "@/services/lecturerService";
import { Class } from "@/services/semesterService";

interface ClassCrudModalProps {
  open: boolean;
  semesterCourseId: number;
  initialData: Class | null;
  onCancel: () => void;
  onOk: () => void;
}

const ClassCrudModalContent: React.FC<ClassCrudModalProps> = ({
  open,
  semesterCourseId,
  initialData,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const { notification } = App.useApp();

  const isEditMode = !!initialData;

  useEffect(() => {
    const fetchLecturers = async () => {
      try {
        const data = await lecturerService.getLecturerList();
        setLecturers(data);
      } catch (err) {
        console.error("Failed to fetch lecturers:", err);
      }
    };

    if (open) {
      fetchLecturers();
      if (isEditMode) {
        form.setFieldsValue({
          ...initialData,
          lecturerId: Number(initialData.lecturer.id),
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form, isEditMode]);

  const lecturerOptions = lecturers.map((lec) => ({
    label: `${lec.fullName} (${lec.accountCode})`,
    value: Number(lec.lecturerId),
  }));

  const handleFinish = async (
    values: CreateClassPayload | UpdateClassPayload
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        ...values,
        totalStudent: Number(values.totalStudent),
        lecturerId: Number(values.lecturerId),
        semesterCourseId: semesterCourseId,
      };

      if (isEditMode) {
        await classManagementService.updateClass(initialData!.id, payload);
        notification.success({
          message: "Class Updated",
          description: "The class has been successfully updated.",
        });
      } else {
        await classManagementService.createClass(payload as CreateClassPayload);
        notification.success({
          message: "Class Created",
          description: "The new class has been created.",
        });
      }
      onOk();
    } catch (err: any) {
      console.error("CRUD Error:", err);
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title={isEditMode ? "Edit Class" : "Create New Class"}
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
          name="classCode"
          label="Class Code"
          rules={[
            { required: true, message: "Please enter the class code" },
            {
              validator: (_, value) => {
                if (!value || value.trim().length === 0) {
                  return Promise.reject(new Error("Class code cannot be empty!"));
                }
                if (value.trim().length < 2) {
                  return Promise.reject(new Error("Class code must be at least 2 characters!"));
                }
                // Check for whitespace
                if (/\s/.test(value)) {
                  return Promise.reject(new Error("Class code cannot contain spaces!"));
                }
                // Only allow alphanumeric characters, underscore, and hyphen
                if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                  return Promise.reject(new Error("Class code can only contain letters, numbers, underscore (_), and hyphen (-)!"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="lecturerId"
          label="Lecturer"
          rules={[{ required: true, message: "Please select a lecturer" }]}
        >
          <Select
            showSearch
            placeholder="Select a lecturer"
            options={lecturerOptions}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item
          name="totalStudent"
          label="Total Students"
          rules={[
            { required: true, message: "Please enter the total students" },
            {
              validator: (_, value) => {
                if (value === undefined || value === null || value === '') {
                  return Promise.reject(new Error("Total students cannot be empty!"));
                }
                const numValue = Number(value);
                if (isNaN(numValue) || numValue < 1) {
                  return Promise.reject(new Error("Total students must be at least 1!"));
                }
                if (numValue > 1000) {
                  return Promise.reject(new Error("Total students cannot exceed 1000!"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input type="number" min={1} max={1000} />
        </Form.Item>
        <Form.Item
          name="description"
          label="Description"
          rules={[
            { required: true, message: "Please enter a description" },
            {
              validator: (_, value) => {
                if (!value || value.trim().length === 0) {
                  return Promise.reject(new Error("Description cannot be empty!"));
                }
                if (value.trim().length < 5) {
                  return Promise.reject(new Error("Description must be at least 5 characters!"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const ClassCrudModal: React.FC<ClassCrudModalProps> = (props) => (
  <App>
    <ClassCrudModalContent {...props} />
  </App>
);
