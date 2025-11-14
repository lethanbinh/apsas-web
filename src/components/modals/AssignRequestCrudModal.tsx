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
  existingAssignRequests?: AssignRequest[];
  onCancel: () => void;
  onOk: () => void;
}

const AssignRequestCrudModalContent: React.FC<AssignRequestCrudModalProps> = ({
  open,
  initialData,
  lecturers,
  courseElements,
  existingAssignRequests = [],
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
        // When editing, status field is hidden (not editable)
        // Status will be kept from existing data or default to 1 in handleFinish
        form.setFieldsValue({
          ...initialData,
          assignedLecturerId: Number(initialData.lecturer.id),
          courseElementId: initialData.courseElement.id,
          status: 1, // Default to Pending (status not in AssignRequest interface, will be handled in handleFinish)
        });
      } else {
        // When creating, use current date
        const currentDate = moment();
        const formattedDate = currentDate.format("DD/MM/YYYY HH:mm:ss");
        form.resetFields();
        form.setFieldsValue({ 
          status: 1,
          assignedAt: formattedDate, // Use current date when creating
        });
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
      let assignedAtValue: string;
      if (isEditMode) {
        // When editing, keep the original assignedAt date
        assignedAtValue = initialData?.assignedAt 
          ? (initialData.assignedAt.endsWith("Z") ? initialData.assignedAt : initialData.assignedAt + "Z")
          : moment().toISOString();
      } else {
        // When creating, use current date
        assignedAtValue = moment().toISOString();
      }
      
      const payload = {
        ...values,
        assignedAt: assignedAtValue,
        assignedByHODId: 1,
        status: values.status || 1, // Ensure status is always set (default to Pending)
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
          rules={[
            { required: true, message: "Please select an element" },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const lecturerId = form.getFieldValue("assignedLecturerId");
                if (!lecturerId) return Promise.resolve();
                
                // Check for duplicate, excluding the current request if editing
                if (existingAssignRequests) {
                  const duplicate = existingAssignRequests.find(
                    (req) =>
                      req.courseElement.id === value &&
                      req.lecturer.id === Number(lecturerId) &&
                      (!isEditMode || req.id !== initialData?.id) // Exclude current request when editing
                  );
                  if (duplicate) {
                    return Promise.reject(
                      new Error(
                        "Đã tồn tại assign request với cùng course element và lecturer trong môn học này!"
                      )
                    );
                  }
                }
                return Promise.resolve();
              },
            },
          ]}
          dependencies={["assignedLecturerId"]}
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
          rules={[
            { required: true, message: "Please select a lecturer" },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const courseElementId = form.getFieldValue("courseElementId");
                if (!courseElementId) return Promise.resolve();
                
                // Check for duplicate, excluding the current request if editing
                if (existingAssignRequests) {
                  const duplicate = existingAssignRequests.find(
                    (req) =>
                      req.courseElement.id === courseElementId &&
                      req.lecturer.id === Number(value) &&
                      (!isEditMode || req.id !== initialData?.id) // Exclude current request when editing
                  );
                  if (duplicate) {
                    return Promise.reject(
                      new Error(
                        "Đã tồn tại assign request với cùng course element và lecturer trong môn học này!"
                      )
                    );
                  }
                }
                return Promise.resolve();
              },
            },
          ]}
          dependencies={["courseElementId"]}
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
        {/* Status is hidden: default to Pending (1) when creating, and not editable when editing */}
        <Form.Item name="status" hidden>
          <Input type="hidden" />
        </Form.Item>
        {!isEditMode && (
          <Form.Item
            name="assignedAt"
            label="Assigned Date"
          >
            <Input disabled readOnly />
          </Form.Item>
        )}
        <Form.Item
          name="message"
          label="Message"
          rules={[
            { required: true, message: "Please enter a message" },
            {
              validator: (_, value) => {
                if (!value || value.trim().length === 0) {
                  return Promise.reject(new Error("Message cannot be empty!"));
                }
                if (value.trim().length < 5) {
                  return Promise.reject(new Error("Message must be at least 5 characters!"));
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

export const AssignRequestCrudModal: React.FC<AssignRequestCrudModalProps> = (
  props
) => (
  <App>
    <AssignRequestCrudModalContent {...props} />
  </App>
);
