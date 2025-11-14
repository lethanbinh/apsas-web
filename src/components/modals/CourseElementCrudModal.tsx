"use client";

import {
  courseElementManagementService,
  CreateCourseElementPayload,
  UpdateCourseElementPayload,
} from "@/services/courseElementManagementService";
import { CourseElement } from "@/services/semesterService";
import { Alert, App, Form, Input, InputNumber, Modal } from "antd";
import { useEffect, useState } from "react";

interface CourseElementCrudModalProps {
  open: boolean;
  semesterCourseId: number;
  initialData: CourseElement | null;
  existingElements?: CourseElement[]; // Existing course elements for validation
  onCancel: () => void;
  onOk: () => void;
}

const CourseElementCrudModalContent: React.FC<CourseElementCrudModalProps> = ({
  open,
  semesterCourseId,
  initialData,
  existingElements = [],
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

    const newWeight = Number(values.weight / 100); // Convert percentage to decimal

    // Validate total weight
    const currentTotalWeight = existingElements.reduce((sum, el) => {
      // If editing, exclude the current element's weight
      if (isEditMode && el.id === initialData!.id) {
        return sum;
      }
      return sum + el.weight;
    }, 0);

    const newTotalWeight = currentTotalWeight + newWeight;

    if (newTotalWeight > 1) {
      const currentTotalPercent = (currentTotalWeight * 100).toFixed(1);
      const remainingPercent = ((1 - currentTotalWeight) * 100).toFixed(1);
      setError(
        `Total weight cannot exceed 100%. Current total: ${currentTotalPercent}%, Remaining: ${remainingPercent}%`
      );
      setIsLoading(false);
      return;
    }

    const payload = {
      name: values.name,
      description: values.description,
      weight: newWeight,
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
          label="Element Name"
          rules={[
            { required: true, message: "Please enter the name" },
            {
              validator: (_, value) => {
                if (!value || value.trim().length === 0) {
                  return Promise.reject(new Error("Element name cannot be empty!"));
                }
                if (value.trim().length < 2) {
                  return Promise.reject(new Error("Element name must be at least 2 characters!"));
                }
                return Promise.resolve();
              },
            },
          ]}
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
        <Form.Item
          name="weight"
          label="Weight (%)"
          rules={[
            { required: true, message: "Please enter the weight" },
            {
              validator: (_, value) => {
                if (value === undefined || value === null) {
                  return Promise.resolve();
                }
                const newWeight = Number(value / 100);
                const currentTotalWeight = existingElements.reduce((sum, el) => {
                  // If editing, exclude the current element's weight
                  if (isEditMode && el.id === initialData!.id) {
                    return sum;
                  }
                  return sum + el.weight;
                }, 0);
                const newTotalWeight = currentTotalWeight + newWeight;
                if (newTotalWeight > 1) {
                  const currentTotalPercent = (currentTotalWeight * 100).toFixed(1);
                  const remainingPercent = ((1 - currentTotalWeight) * 100).toFixed(1);
                  return Promise.reject(
                    new Error(
                      `Total weight cannot exceed 100%. Current total: ${currentTotalPercent}%, Remaining: ${remainingPercent}%`
                    )
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber 
            min={0} 
            max={100} 
            style={{ width: "100%" }}
            precision={1}
            step={0.1}
          />
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
