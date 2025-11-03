"use client";

import { Alert, App, Form, Input, Modal } from "antd";
import { useEffect, useMemo, useState } from "react";

import {
  Course,
  courseService,
  CreateCoursePayload,
  UpdateCoursePayload,
} from "@/services/courseManagementService";

interface CourseOnlyCrudModalProps {
  open: boolean;
  initialData: Course | null;
  existingCodes: string[];
  onCancel: () => void;
  onOk: () => void;
}

const CourseOnlyCrudModalContent: React.FC<CourseOnlyCrudModalProps> = ({
  open,
  initialData,
  existingCodes,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notification } = App.useApp();

  const isEditMode = !!initialData;

  const normalizedExistingCodes = useMemo(
    () => existingCodes.map((code) => code.toLowerCase()),
    [existingCodes]
  );

  useEffect(() => {
    if (open) {
      if (isEditMode) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form, isEditMode]);

  const handleFinish = async (
    values: CreateCoursePayload | UpdateCoursePayload
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isEditMode) {
        await courseService.updateCourse(
          initialData!.id,
          values as UpdateCoursePayload
        );
        notification.success({
          message: "Course Updated",
          description: "The course has been successfully updated.",
        });
      } else {
        await courseService.createCourse(values as CreateCoursePayload);
        notification.success({
          message: "Course Created",
          description: "The new course has been successfully created.",
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
      title={isEditMode ? "Edit Course" : "Create New Course"}
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
          label="Course Name"
          rules={[{ required: true, message: "Please enter the course name" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="code"
          label="Course Code"
          rules={[
            { required: true, message: "Please enter the course code" },
            {
              validator: (_, value) => {
                if (
                  !isEditMode &&
                  value &&
                  normalizedExistingCodes.includes(value.toLowerCase())
                ) {
                  return Promise.reject("This course code already exists.");
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input disabled={isEditMode} />
        </Form.Item>
        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: "Please enter a description" }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const CourseOnlyCrudModal: React.FC<CourseOnlyCrudModalProps> = (
  props
) => <CourseOnlyCrudModalContent {...props} />;
