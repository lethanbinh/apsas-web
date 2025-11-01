"use client";

import { Modal, Form, Input, Spin, Alert, App, InputNumber } from "antd";
import { useEffect, useState } from "react";
import {
  courseElementManagementService,
  CreateCourseElementPayload,
  UpdateCourseElementPayload,
} from "@/services/courseElementManagementService";
import { CourseElement } from "@/services/semesterService";

interface CourseElementCrudModalProps {
  open: boolean;
  semesterCourseId: number;
  initialData: CourseElement | null;
  onCancel: () => void;
  onOk: () => void;
}

const CourseElementCrudModalContent: React.FC<CourseElementCrudModalProps> = ({
  open,
  semesterCourseId,
  initialData,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notification } = App.useApp();

  const isEditMode = !!initialData;

  useEffect(() => {
    if (open) {
      if (isEditMode) {
        form.setFieldsValue({
          ...initialData,
          weight: initialData.weight * 100,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form, isEditMode]);

  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);

    const payload = {
      name: values.name,
      description: values.description,
      weight: Number(values.weight / 100),
    };

    try {
      if (isEditMode) {
        await courseElementManagementService.updateCourseElement(
          initialData!.id,
          payload as UpdateCourseElementPayload
        );
        notification.success({
          message: "Element Updated",
          description: "The course element has been successfully updated.",
        });
      } else {
        const createPayload: CreateCourseElementPayload = {
          ...payload,
          semesterCourseId: semesterCourseId,
        };
        await courseElementManagementService.createCourseElement(createPayload);
        notification.success({
          message: "Element Created",
          description: "The new course element has been created.",
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
      title={isEditMode ? "Edit Course Element" : "Create New Course Element"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={isLoading}
      destroyOnClose
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
          label="Element Name"
          rules={[{ required: true, message: "Please enter the name" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: "Please enter a description" }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item
          name="weight"
          label="Weight (%)"
          rules={[{ required: true, message: "Please enter the weight" }]}
        >
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const CourseElementCrudModal: React.FC<CourseElementCrudModalProps> = (
  props
) => (
  <App>
    <CourseElementCrudModalContent {...props} />
  </App>
);
