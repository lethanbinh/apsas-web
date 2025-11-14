"use client";

import { Alert, App, Form, Input, Modal } from "antd";
import { useEffect, useState } from "react";

import {
  Course,
  courseService,
  CreateCoursePayload,
  UpdateCoursePayload,
  semesterCourseService,
} from "@/services/courseManagementService";

interface CourseOnlyCrudModalProps {
  open: boolean;
  initialData: Course | null;
  selectedSemesterId?: number | null;
  existingSemesterCourses?: Course[];
  allCourses?: Course[];
  onCancel: () => void;
  onOk: () => void;
}

const CourseOnlyCrudModalContent: React.FC<CourseOnlyCrudModalProps> = ({
  open,
  initialData,
  selectedSemesterId,
  existingSemesterCourses = [],
  allCourses = [],
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
        const newCourse = await courseService.createCourse(values as CreateCoursePayload);
        
        // If a semester is selected, link the course to that semester
        if (selectedSemesterId) {
          try {
            await semesterCourseService.createSemesterCourse({
              semesterId: selectedSemesterId,
              courseId: newCourse.id,
              createdByHODId: 1,
            });
            notification.success({
              message: "Course Created",
              description: "The new course has been created and linked to the selected semester.",
            });
          } catch (linkErr: any) {
            // Course created but linking failed
            console.error("Failed to link course to semester:", linkErr);
            notification.warning({
              message: "Course Created",
              description: "Course created but failed to link to semester. Please link manually.",
            });
          }
        } else {
          notification.success({
            message: "Course Created",
            description: "The new course has been successfully created.",
          });
        }
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
                
                // Check for duplicate name
                // If semester is selected, check in that semester; otherwise check all courses
                const coursesToCheck = selectedSemesterId && existingSemesterCourses.length > 0 
                  ? existingSemesterCourses 
                  : allCourses;
                
                if (coursesToCheck.length > 0) {
                  if (!isEditMode) {
                    const duplicate = coursesToCheck.find(
                      (c) => c.name.toLowerCase().trim() === value.toLowerCase().trim()
                    );
                    if (duplicate) {
                      const message = selectedSemesterId 
                        ? "Đã tồn tại course với tên này trong học kỳ này!"
                        : "Đã tồn tại course với tên này!";
                      return Promise.reject(new Error(message));
                    }
                  } else {
                    // When editing, exclude current course
                    const duplicate = coursesToCheck.find(
                      (c) => 
                        c.name.toLowerCase().trim() === value.toLowerCase().trim() &&
                        c.id !== initialData?.id
                    );
                    if (duplicate) {
                      const message = selectedSemesterId 
                        ? "Đã tồn tại course với tên này trong học kỳ này!"
                        : "Đã tồn tại course với tên này!";
                      return Promise.reject(new Error(message));
                    }
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
                // Check for whitespace
                if (/\s/.test(value)) {
                  return Promise.reject(new Error("Course code cannot contain spaces!"));
                }
                // Only allow alphanumeric characters, underscore, and hyphen
                if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                  return Promise.reject(new Error("Course code can only contain letters, numbers, underscore (_), and hyphen (-)!"));
                }
                
                // Check for duplicate code
                // If semester is selected, check in that semester; otherwise check all courses
                const coursesToCheck = selectedSemesterId && existingSemesterCourses.length > 0 
                  ? existingSemesterCourses 
                  : allCourses;
                
                if (coursesToCheck.length > 0) {
                  if (!isEditMode) {
                    const duplicate = coursesToCheck.find(
                      (c) => c.code.toLowerCase().trim() === value.toLowerCase().trim()
                    );
                    if (duplicate) {
                      const message = selectedSemesterId 
                        ? "Đã tồn tại course với mã code này trong học kỳ này!"
                        : "Đã tồn tại course với mã code này!";
                      return Promise.reject(new Error(message));
                    }
                  } else {
                    // When editing, exclude current course
                    const duplicate = coursesToCheck.find(
                      (c) => 
                        c.code.toLowerCase().trim() === value.toLowerCase().trim() &&
                        c.id !== initialData?.id
                    );
                    if (duplicate) {
                      const message = selectedSemesterId 
                        ? "Đã tồn tại course với mã code này trong học kỳ này!"
                        : "Đã tồn tại course với mã code này!";
                      return Promise.reject(new Error(message));
                    }
                  }
                }
                
                return Promise.resolve();
              },
            },
          ]}
          dependencies={["name"]}
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
