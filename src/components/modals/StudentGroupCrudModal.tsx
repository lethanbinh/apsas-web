"use client";

import {
  CreateStudentGroupPayload,
  StudentDetail,
  studentManagementService,
} from "@/services/studentManagementService";
import { Alert, App, Form, Input, Modal, Select } from "antd";
import { useEffect, useState } from "react";

interface StudentGroupCrudModalProps {
  open: boolean;
  classId: number;
  onCancel: () => void;
  onOk: () => void;
}

const StudentGroupCrudModalContent: React.FC<StudentGroupCrudModalProps> = ({
  open,
  classId,
  onCancel,
  onOk,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentDetail[]>([]);
  const { notification } = App.useApp();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await studentManagementService.getStudentList();
        setStudents(data);
      } catch (err) {
        console.error("Failed to fetch students:", err);
      }
    };

    if (open) {
      fetchStudents();
      form.resetFields();
    }
  }, [open, form]);

  const studentOptions = students.map((s) => ({
    label: `${s.fullName} (${s.accountCode})`,
    value: Number(s.studentId),
  }));

  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload: CreateStudentGroupPayload = {
        classId: classId,
        studentId: Number(values.studentId),
        description: values.description || "Enrolled by HOD",
      };

      await studentManagementService.createStudentGroup(payload);
      notification.success({
        message: "Student Added",
        description: "The student has been successfully added to the class.",
      });

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
      title="Add Student to Class"
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
          name="studentId"
          label="Student"
          rules={[{ required: true, message: "Please select a student" }]}
        >
          <Select
            showSearch
            placeholder="Select a student"
            options={studentOptions}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={4} placeholder="Enrollment description..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const StudentGroupCrudModal: React.FC<StudentGroupCrudModalProps> = (
  props
) => (
  <App>
    <StudentGroupCrudModalContent {...props} />
  </App>
);
