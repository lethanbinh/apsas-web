"use client";

import React, { useState } from "react";
import { Card, Input, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button } from "../ui/Button"; // Import Button tùy chỉnh
import styles from "./SubmissionHistory.module.css";

const { Title, Text } = Typography;

// Định nghĩa kiểu dữ liệu cho mỗi lượt nộp bài
interface Submission {
  key: string;
  no: number;
  fileSubmit: string;
  student: string;
  date: string;
  score: string;
  status: "On time" | "Late";
}

// Dữ liệu mẫu
const submissionData: Submission[] = [
  {
    key: "1",
    no: 1,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "13/05/2022",
    score: "5/10",
    status: "On time",
  },
  {
    key: "2",
    no: 2,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "22/05/2022",
    score: "5/10",
    status: "On time",
  },
  {
    key: "3",
    no: 3,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "15/06/2022",
    score: "5/10",
    status: "On time",
  },
  {
    key: "4",
    no: 4,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "06/09/2022",
    score: "5/10",
    status: "Late",
  },
  {
    key: "5",
    no: 5,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "25/09/2022",
    score: "5/10",
    status: "Late",
  },
  {
    key: "6",
    no: 6,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "04/10/2022",
    score: "5/10",
    status: "On time",
  },
  {
    key: "7",
    no: 7,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "17/10/2022",
    score: "5/10",
    status: "On time",
  },
  {
    key: "8",
    no: 8,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "24/10/2022",
    score: "5/10",
    status: "On time",
  },
  {
    key: "9",
    no: 9,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "01/11/2022",
    score: "5/10",
    status: "Late",
  },
  {
    key: "10",
    no: 10,
    fileSubmit: "SE172257_Assignment01.zip",
    student: "Le Thu An",
    date: "22/11/2022",
    score: "5/10",
    status: "Late",
  },
];

// Định nghĩa các cột
const columns: TableProps<Submission>["columns"] = [
  {
    title: "No",
    dataIndex: "no",
    key: "no",
    width: 60,
  },
  {
    title: "File submit",
    dataIndex: "fileSubmit",
    key: "fileSubmit",
    render: (text) => <Text strong>{text}</Text>, // Làm đậm tên file
  },
  {
    title: "Student",
    dataIndex: "student",
    key: "student",
    sorter: (a, b) => a.student.localeCompare(b.student),
  },
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    sorter: (a, b) => a.date.localeCompare(b.date),
  },
  {
    title: "Score",
    dataIndex: "score",
    key: "score",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: Submission["status"]) => {
      const color = status === "On time" ? "success" : "error"; // Dùng màu có sẵn
      return <Tag color={color}>{status}</Tag>;
    },
    filters: [
      { text: "On time", value: "On time" },
      { text: "Late", value: "Late" },
    ],
    onFilter: (value, record) => record.status === value,
  },
  {
    title: "Action",
    key: "action",
    align: "center",
    render: () => (
      <Button
        variant="ghost" // Nút không có nền
        size="small"
        icon={<DownloadOutlined />}
        style={{ border: "none" }}
      >
        {""}
      </Button>
    ),
  },
];

export default function SubmissionHistory() {
  const [searchText, setSearchText] = useState("");

  // Logic filter (filter theo tên file hoặc tên sinh viên)
  const filteredData = submissionData.filter(
    (item) =>
      item.fileSubmit.toLowerCase().includes(searchText.toLowerCase()) ||
      item.student.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Title
          level={2}
          style={{
            fontWeight: 700,
            color: "#2F327D",
            margin: 0,
          }}
        >
          Submission History
        </Title>
        <Input
          placeholder="Search..."
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.searchBar}
          prefix={<SearchOutlined />}
        />
      </div>

      <Card className={styles.historyCard}>
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          className={styles.historyTable}
        />
      </Card>
    </div>
  );
}
