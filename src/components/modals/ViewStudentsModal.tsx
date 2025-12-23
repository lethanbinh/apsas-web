"use client";
import { StudentInClass } from "@/services/classService";
import {
  CreateStudentGroupPayload,
  StudentDetail,
  UpdateStudentGroupPayload,
  studentManagementService,
} from "@/services/studentManagementService";
import { EditOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import {
  Alert,
  App,
  Avatar,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
} from "antd";
import { format } from "date-fns";
import { useEffect, useState } from "react";
const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};
interface ViewStudentsModalProps {
  open: boolean;
  classId: number | null;
  classCode?: string;
  onCancel: () => void;
  onDeleteStudent?: (studentGroupId: number) => void;
  onRefresh?: () => void;
  refreshTrigger?: number;
}
export const ViewStudentsModal = ({
  open,
  classId,
  classCode,
  onCancel,
  onDeleteStudent,
  onRefresh,
  refreshTrigger,
}: ViewStudentsModalProps) => {
  const [students, setStudents] = useState<StudentInClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentInClass | null>(null);
  const [allStudents, setAllStudents] = useState<StudentDetail[]>([]);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { modal, notification } = App.useApp();
  useEffect(() => {
    const fetchData = async () => {
      if (!classId || !open) {
        setStudents([]);
        return;
      }
      setLoading(true);
      try {
        const [studentsData, allStudentsData] = await Promise.all([
          studentManagementService.getStudentsInClass(classId),
          studentManagementService.getStudentList(),
        ]);
        setStudents(studentsData);
        setAllStudents(allStudentsData);
      } catch (e) {
        console.error(e);
        setStudents([]);
        setAllStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [classId, open, refreshTrigger]);
  const handleAddStudent = () => {
    setIsAddModalOpen(true);
    addForm.resetFields();
  };
  const handleAddCancel = () => {
    setIsAddModalOpen(false);
    addForm.resetFields();
  };
  const handleAddFinish = async (values: any) => {
    if (!classId) return;
    setIsSubmitting(true);
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
      const updatedStudents = await studentManagementService.getStudentsInClass(classId);
      setStudents(updatedStudents);
      setIsAddModalOpen(false);
      addForm.resetFields();
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error("Failed to add student:", err);
      notification.error({
        message: "Failed to Add Student",
        description: err.message || "An error occurred while adding the student.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleEditStudent = (record: StudentInClass) => {
    setEditingStudent(record);
    editForm.setFieldsValue({
      description: record.description || "",
    });
    setIsEditModalOpen(true);
  };
  const handleEditCancel = () => {
    setIsEditModalOpen(false);
    setEditingStudent(null);
    editForm.resetFields();
  };
  const handleEditFinish = async (values: any) => {
    if (!editingStudent) return;
    setIsSubmitting(true);
    try {
      const payload: UpdateStudentGroupPayload = {
        description: values.description || "Enrolled by HOD",
      };
      await studentManagementService.updateStudentGroup(editingStudent.id, payload);
      notification.success({
        message: "Student Updated",
        description: "The student information has been successfully updated.",
      });
      if (classId) {
        const updatedStudents = await studentManagementService.getStudentsInClass(classId);
        setStudents(updatedStudents);
      }
      setIsEditModalOpen(false);
      setEditingStudent(null);
      editForm.resetFields();
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error("Failed to update student:", err);
      notification.error({
        message: "Failed to Update Student",
        description: err.message || "An error occurred while updating the student.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDeleteStudent = async (studentGroupId: number) => {
    try {
      await studentManagementService.deleteStudentGroup(studentGroupId);
      notification.success({
        message: "Student Removed",
        description: "The student has been successfully removed from the class.",
      });
      setStudents(prev => prev.filter(s => s.id !== studentGroupId));
      if (onDeleteStudent) {
        onDeleteStudent(studentGroupId);
      }
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error("Failed to delete student:", err);
      notification.error({
        message: "Failed to Remove Student",
        description: err.message || "An error occurred while removing the student.",
      });
    }
  };
  const studentOptions = allStudents
    .filter(s => !students.some(existing => Number(existing.studentId) === Number(s.studentId)))
    .map((s) => ({
      label: `${s.fullName} (${s.accountCode})`,
      value: Number(s.studentId),
    }));
  const columns: TableProps<StudentInClass>["columns"] = [
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "code",
    },
    {
      title: "Full Name",
      dataIndex: "studentName",
      key: "name",
      render: (name: string) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: "Enrolled",
      dataIndex: "enrollmentDate",
      key: "enrolled",
      render: (date: string) => formatUtcDate(date, "dd/MM/yyyy"),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (desc: string) => (
        <div style={{ wordBreak: "break-word", whiteSpace: "normal", maxWidth: 300 }}>
          {desc || "N/A"}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: StudentInClass) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditStudent(record)}
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            onClick={() => {
              modal.confirm({
                title: "Are you sure you want to remove this student?",
                content: "This action will remove the student from this class.",
                okText: "Yes, Remove",
                okType: "danger",
                cancelText: "No",
                onOk: () => handleDeleteStudent(record.id),
              });
            }}
          >
            Remove
          </Button>
        </Space>
      ),
    },
  ];
  return (
    <>
      <Modal
        title={`Students in Class${classCode ? `: ${classCode}` : ""}`}
        open={open}
        onCancel={onCancel}
        footer={null}
        width={900}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddStudent}
          style={{ marginBottom: 16 }}
        >
          Add Student
        </Button>
        <Table
          loading={loading}
          columns={columns}
          dataSource={students}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Modal>
      {}
      <Modal
        title="Add Student to Class"
        open={isAddModalOpen}
        onCancel={handleAddCancel}
        onOk={() => addForm.submit()}
        confirmLoading={isSubmitting}
        destroyOnHidden
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddFinish}>
          <Form.Item
            name="studentId"
            label="Student"
            rules={[
              { required: true, message: "Please select a student" },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const existingStudent = students.find(
                    (s) => Number(s.studentId) === Number(value)
                  );
                  if (existingStudent) {
                    return Promise.reject(
                      new Error("This student is already in the class!")
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
                    return Promise.resolve();
                  }
                  if (value.trim().length < 5) {
                    return Promise.reject(
                      new Error("Description must be at least 5 characters if provided!")
                    );
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
      {}
      <Modal
        title="Edit Student Information"
        open={isEditModalOpen}
        onCancel={handleEditCancel}
        onOk={() => editForm.submit()}
        confirmLoading={isSubmitting}
        destroyOnHidden
      >
        {editingStudent && (
          <Form form={editForm} layout="vertical" onFinish={handleEditFinish}>
            <Form.Item label="Student Code">
              <Input value={editingStudent.studentCode} disabled />
            </Form.Item>
            <Form.Item label="Student Name">
              <Input value={editingStudent.studentName} disabled />
            </Form.Item>
            <Form.Item
              name="description"
              label="Description"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.trim().length === 0) {
                      return Promise.resolve();
                    }
                    if (value.trim().length < 5) {
                      return Promise.reject(
                        new Error("Description must be at least 5 characters if provided!")
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input.TextArea rows={4} placeholder="Enrollment description..." />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
};