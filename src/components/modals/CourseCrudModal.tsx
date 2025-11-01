"use client";

import { Modal, Form, Input, Spin, Alert, App } from "antd";
import { useEffect, useState } from "react";
import {
  courseService,
  CreateCoursePayload,
  semesterCourseService,
  UpdateCoursePayload,
} from "@/services/courseManagementService";
import { Course } from "@/services/courseElementService";

interface CourseCrudModalProps {
  open: boolean;
  semesterId: number;
  initialData: Course | null;
  onCancel: () => void;
  onOk: () => void;
}

const CourseCrudModalContent: React.FC<CourseCrudModalProps> = ({
  open,
  semesterId,
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
        const newCourse = await courseService.createCourse(
          values as CreateCoursePayload
        );
        await semesterCourseService.createSemesterCourse({
          semesterId: semesterId,
          courseId: newCourse.id,
          createdByHODId: 1,
        });
        notification.success({
          message: "Course Created",
          description:
            "The new course has been created and linked to the semester.",
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
          label="Course Name"
          rules={[{ required: true, message: "Please enter the course name" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="code"
          label="Course Code"
          rules={[{ required: true, message: "Please enter the course code" }]}
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
      </Form>
    </Modal>
  );
};

export const CourseCrudModal: React.FC<CourseCrudModalProps> = (props) => (
  <App>
    <CourseCrudModalContent {...props} />
  </App>
);
