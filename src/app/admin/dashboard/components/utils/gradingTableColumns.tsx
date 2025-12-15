import { Space, Tag } from "antd";
import { UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

export const gradingGroupColumns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 80,
  },
  {
    title: "Lecturer",
    key: "lecturer",
    render: (_: any, record: any) => (
      <Space>
        <UserOutlined />
        <span>{record.lecturerName || "N/A"} ({record.lecturerCode || "N/A"})</span>
      </Space>
    ),
  },
  {
    title: "Assessment Template",
    dataIndex: "assessmentTemplateName",
    key: "assessmentTemplateName",
    render: (name: string) => name || "N/A",
  },
  {
    title: "Submissions",
    dataIndex: "submissionCount",
    key: "submissionCount",
    render: (count: number) => (
      <Tag color="blue">{count || 0}</Tag>
    ),
  },
  {
    title: "Created At",
    dataIndex: "createdAt",
    key: "createdAt",
    render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
  },
];

export const sessionColumns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 80,
  },
  {
    title: "Student",
    key: "student",
    render: (_: any, record: any) => (
      <Space>
        <UserOutlined />
        <span>{record.submissionStudentName} ({record.submissionStudentCode})</span>
      </Space>
    ),
  },
  {
    title: "Grade",
    dataIndex: "grade",
    key: "grade",
    render: (grade: number) => (
      <Tag color={grade > 0 ? "green" : "default"}>
        {grade > 0 ? grade.toFixed(2) : "N/A"}
      </Tag>
    ),
  },
  {
    title: "Type",
    dataIndex: "gradingType",
    key: "gradingType",
    render: (type: number) => {
      const types = ["AI", "Lecturer", "Both"];
      const colors = ["blue", "purple", "green"];
      return <Tag color={colors[type] || "default"}>{types[type] || "Unknown"}</Tag>;
    },
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: number) => {
      const statusMap: Record<number, { text: string; color: string }> = {
        0: { text: "Processing", color: "orange" },
        1: { text: "Completed", color: "green" },
        2: { text: "Failed", color: "red" },
      };
      const statusInfo = statusMap[status] || { text: "Unknown", color: "default" };
      return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
    },
  },
  {
    title: "Created At",
    dataIndex: "createdAt",
    key: "createdAt",
    render: (date: string) => dayjs(date).format("MMM DD, YYYY HH:mm"),
  },
];

export const requestColumns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 80,
  },
  {
    title: "Course Element",
    dataIndex: "courseElementName",
    key: "courseElementName",
  },
  {
    title: "Course",
    dataIndex: "courseName",
    key: "courseName",
  },
  {
    title: "Lecturer",
    dataIndex: "assignedLecturerName",
    key: "assignedLecturerName",
  },
  {
    title: "HOD",
    dataIndex: "assignedByHODName",
    key: "assignedByHODName",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: number) => {
      const statusMap: Record<number, { text: string; color: string }> = {
        0: { text: "Pending", color: "orange" },
        1: { text: "Approved", color: "green" },
        2: { text: "Rejected", color: "red" },
      };
      const statusInfo = statusMap[status] || { text: "Unknown", color: "default" };
      return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
    },
  },
  {
    title: "Created At",
    dataIndex: "createdAt",
    key: "createdAt",
    render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
  },
];

