"use client";

import { assignRequestService } from "@/services/assignRequestService";
import { Lecturer } from "@/services/lecturerService";
import { AssignRequest, CourseElement } from "@/services/semesterService";
import { Alert, App, DatePicker, Form, Input, Modal, Select } from "antd";
import moment from "moment";
import { useEffect, useState } from "react";

const parseUtcDate = (dateString?: string) => {
  if (!dateString) return null;
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return moment(date);
};

interface AssignRequestCrudModalProps {
  open: boolean;
  initialData: AssignRequest | null;
  lecturers: Lecturer[];
  courseElements: CourseElement[];
  onCancel: () => void;
  onOk: () => void;
}

const AssignRequestCrudModalContent: React.FC<AssignRequestCrudModalProps> = ({
  open,
  initialData,
  lecturers,
  courseElements,
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
          assignedLecturerId: Number(initialData.lecturer.id),
          courseElementId: initialData.courseElement.id,
          assignedAt: parseUtcDate(initialData.assignedAt),
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ status: 1 });
      }
    }
  }, [open, initialData, form, isEditMode]);

  const lecturerOptions = lecturers.map((lec) => ({
    label: `${lec.fullName} (${lec.accountCode})`,
    value: Number(lec.lecturerId),
  }));

  const elementOptions = courseElements.map((el) => ({
    label: el.name,
    value: el.id,
  }));

  const statusOptions = [
    { label: "Pending", value: 1 },
    { label: "Accepted", value: 2 },
    { label: "Rejected", value: 3 },
    { label: "In Progress", value: 4 },
    { label: "Completed", value: 5 },
  ];

  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        ...values,
        assignedAt: values.assignedAt.toISOString(),
        assignedByHODId: 1,
      };

      if (isEditMode) {
        await assignRequestService.updateAssignRequest(
          initialData!.id,
          payload
        );
        notification.success({
          message: "Request Updated",
          description: "The assign request has been successfully updated.",
        });
      } else {
        await assignRequestService.createAssignRequest(payload);
        notification.success({
          message: "Request Created",
          description: "The new assign request has been created.",
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
      title={isEditMode ? "Edit Assign Request" : "Create Assign Request"}
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
          name="courseElementId"
          label="Course Element"
          rules={[{ required: true, message: "Please select an element" }]}
        >
          <Select
            showSearch
            placeholder="Select a course element"
            options={elementOptions}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item
          name="assignedLecturerId"
          label="Assign to Lecturer"
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
          name="status"
          label="Status"
          rules={[{ required: true, message: "Please select a status" }]}
        >
          <Select placeholder="Select status" options={statusOptions} />
        </Form.Item>
        <Form.Item
          name="assignedAt"
          label="Assigned Date"
          rules={[{ required: true, message: "Please select a date" }]}
        >
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="message"
          label="Message"
          rules={[{ required: true, message: "Please enter a message" }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const AssignRequestCrudModal: React.FC<AssignRequestCrudModalProps> = (
  props
) => <AssignRequestCrudModalContent {...props} />;
