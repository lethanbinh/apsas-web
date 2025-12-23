"use client";
import { Course } from "@/services/courseElementService";
import {
  courseService,
  CreateCoursePayload,
  semesterCourseService,
  UpdateCoursePayload,
} from "@/services/courseManagementService";
import { SemesterCourse } from "@/services/semesterService";
import { Alert, App, Form, Input, Modal } from "antd";
import { useEffect, useState } from "react";
interface CourseCrudModalProps {
  open: boolean;
  semesterId: number;
  initialData: Course | null;
  existingSemesterCourses?: SemesterCourse[];
  onCancel: () => void;
  onOk: () => void;
}
const CourseCrudModalContent: React.FC<CourseCrudModalProps> = ({
  open,
  semesterId,
  initialData,
  existingSemesterCourses = [],
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
          rules={[
            { required: true, message: "Please enter the course name" },
            {
              validator: (_, value) => {
                if (!value || value.trim().length === 0) {
                  return Promise.reject(new Error("Course name cannot be empty!"));
                }
                if (value.trim().length < 2) {
                  return Promise.reject(new Error("Course name must be at least 2 characters!"));
                }
                if (!isEditMode && existingSemesterCourses) {
                  const duplicate = existingSemesterCourses.find(
                    (sc) => sc.course.name.toLowerCase().trim() === value.toLowerCase().trim()
                  );
                  if (duplicate) {
                    return Promise.reject(
                      new Error("A course with this name already exists in this semester!")
                    );
                  }
                }
                if (isEditMode && existingSemesterCourses) {
                  const duplicate = existingSemesterCourses.find(
                    (sc) =>
                      sc.course.name.toLowerCase().trim() === value.toLowerCase().trim() &&
                      sc.course.id !== initialData?.id
                  );
                  if (duplicate) {
                    return Promise.reject(
                      new Error("A course with this name already exists in this semester!")
                    );
                  }
                }
                return Promise.resolve();
              },
            },
          ]}
          dependencies={["code"]}
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
                if (!value || value.trim().length === 0) {
                  return Promise.reject(new Error("Course code cannot be empty!"));
                }
                if (value.trim().length < 2) {
                  return Promise.reject(new Error("Course code must be at least 2 characters!"));
                }
                if (/\s/.test(value)) {
                  return Promise.reject(new Error("Course code cannot contain spaces!"));
                }
                if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                  return Promise.reject(new Error("Course code can only contain letters, numbers, underscore (_), and hyphen (-)!"));
                }
                if (!isEditMode && existingSemesterCourses) {
                  const duplicate = existingSemesterCourses.find(
                    (sc) => sc.course.code.toLowerCase().trim() === value.toLowerCase().trim()
                  );
                  if (duplicate) {
                    return Promise.reject(
                      new Error("A course with this code already exists in this semester!")
                    );
                  }
                }
                if (isEditMode && existingSemesterCourses) {
                  const duplicate = existingSemesterCourses.find(
                    (sc) =>
                      sc.course.code.toLowerCase().trim() === value.toLowerCase().trim() &&
                      sc.course.id !== initialData?.id
                  );
                  if (duplicate) {
                    return Promise.reject(
                      new Error("A course with this code already exists in this semester!")
                    );
                  }
                }
                return Promise.resolve();
              },
            },
          ]}
          dependencies={["name"]}
        >
          <Input />
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
export const CourseCrudModal: React.FC<CourseCrudModalProps> = (props) => (
  <App>
    <CourseCrudModalContent {...props} />
  </App>
);