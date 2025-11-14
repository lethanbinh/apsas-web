"use client";

import {
  CreateStudentGroupPayload,
  StudentDetail,
  studentManagementService,
} from "@/services/studentManagementService";
import { StudentInClass } from "@/services/classService";
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
  const [existingStudents, setExistingStudents] = useState<StudentInClass[]>([]);
  const { notification } = App.useApp();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all students
        const allStudents = await studentManagementService.getStudentList();
        setStudents(allStudents);
        
        // Fetch existing students in class
        if (classId) {
          const existing = await studentManagementService.getStudentsInClass(classId);
          setExistingStudents(existing);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    if (open) {
      fetchData();
      form.resetFields();
    }
  }, [open, form, classId]);

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
          rules={[
            { required: true, message: "Please select a student" },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                
                // Check if student already exists in class
                const existingStudent = existingStudents.find(
                  (s) => Number(s.studentId) === Number(value)
                );
                
                if (existingStudent) {
                  return Promise.reject(
                    new Error("Student này đã có trong lớp rồi!")
                  );
                }
                
                return Promise.resolve();
              },
            },
          ]}
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
        <Form.Item 
          name="description" 
          label="Description"
          rules={[
            {
              validator: (_, value) => {
                if (!value || value.trim().length === 0) {
                  return Promise.resolve(); // Optional field
                }
                if (value.trim().length < 5) {
                  return Promise.reject(new Error("Description must be at least 5 characters if provided!"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
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
