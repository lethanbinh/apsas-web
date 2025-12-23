"use client";
import { useState, useEffect } from "react";
import type { TableProps } from "antd";
import { Avatar, Button, Space, Table, Tag } from "antd";
import { TeamOutlined, UserOutlined } from "@ant-design/icons";
import { Class } from "@/services/semesterService";
import { studentManagementService } from "@/services/studentManagementService";
import { Typography } from "antd";
const { Text } = Typography;
interface ClassesTableProps {
  classes: Class[];
  onEdit: (cls: Class) => void;
  onDelete: (classId: number) => void;
  onAddStudent: (classId: number) => void;
  onViewStudents: (classId: number, classCode: string) => void;
  onDeleteStudent: (studentGroupId: number) => void;
  refreshTrigger?: number;
  isSemesterEnded?: boolean;
}
export const ClassesTable = ({
  classes,
  onEdit,
  onDelete,
  onAddStudent,
  onViewStudents,
  onDeleteStudent,
  refreshTrigger,
  isSemesterEnded = false,
}: ClassesTableProps) => {
  const [studentCounts, setStudentCounts] = useState<Map<number, number>>(new Map());
  const [loadingCounts, setLoadingCounts] = useState(false);
  useEffect(() => {
    const fetchStudentCounts = async () => {
      setLoadingCounts(true);
      const counts = new Map<number, number>();
      try {
        await Promise.all(
          classes.map(async (cls) => {
            try {
              const students = await studentManagementService.getStudentsInClass(cls.id);
              counts.set(cls.id, students.length);
            } catch (err) {
              console.error(`Failed to fetch students for class ${cls.id}:`, err);
              counts.set(cls.id, 0);
            }
          })
        );
      } catch (err) {
        console.error("Failed to fetch student counts:", err);
      } finally {
        setStudentCounts(counts);
        setLoadingCounts(false);
      }
    };
    if (classes.length > 0) {
      fetchStudentCounts();
    }
  }, [classes, refreshTrigger]);
  const columns: TableProps<Class>["columns"] = [
    {
      title: "Class Code",
      dataIndex: "classCode",
      key: "classCode",
    },
    {
      title: "Lecturer",
      dataIndex: ["lecturer", "account", "fullName"],
      key: "lecturer",
      render: (name: string, record: Class) => (
        <Space direction="vertical" size={0}>
          <Space>
            <Avatar
              src={record.lecturer.account.avatar}
              icon={<UserOutlined />}
            />
            <span>{name}</span>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.lecturer.account.accountCode || "N/A"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Lecturer Info",
      key: "lecturerInfo",
      render: (_, record: Class) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>
            <strong>Dept:</strong> {record.lecturer.department || "N/A"}
          </Text>
          <Text style={{ fontSize: 12 }}>
            <strong>Email:</strong> {record.lecturer.account.email || "N/A"}
          </Text>
          {record.lecturer.account.phoneNumber && (
            <Text style={{ fontSize: 12 }}>
              <strong>Phone:</strong> {record.lecturer.account.phoneNumber}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Students",
      key: "totalStudent",
      render: (_: any, record: Class) => {
        const count = studentCounts.get(record.id) ?? 0;
        return <Tag color="blue">{loadingCounts ? "..." : `${count} Students`}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<TeamOutlined />} onClick={() => onViewStudents(record.id, record.classCode)}>
            View Students
          </Button>
          <Button type="link" onClick={() => onEdit(record)} disabled={isSemesterEnded}>
            Edit
          </Button>
          <Button type="link" danger onClick={() => onDelete(record.id)} disabled={isSemesterEnded}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];
  return (
    <Table
      columns={columns}
      dataSource={classes}
      rowKey="id"
      pagination={{ pageSize: 5, hideOnSinglePage: true }}
      scroll={{ x: 'max-content' }}
    />
  );
};