"use client";

import React, { useState, useMemo } from "react";
import { Table, Spin, App, Space, Typography, Input, Tag, Button } from "antd";
import type { TableProps } from "antd";
import {
  DownloadOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { format } from "date-fns";
import styles from "./Submissions.module.css";
import { mockSubmissions, Submission } from "../../mockData";
import { useRouter } from "next/navigation";

const { Title } = Typography;

const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};

const getStatusTag = (status: string) => {
  if (status === "Late") {
    return <Tag color="red">Late</Tag>;
  }
  return <Tag color="green">On time</Tag>;
};

const SubmissionsPageContent = ({ shiftId }: { shiftId: string }) => {
  const [submissions, setSubmissions] = useState<Submission[]>(mockSubmissions);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const filteredData = useMemo(() => {
    return submissions.filter(
      (sub) =>
        sub.student.toLowerCase().includes(searchText.toLowerCase()) ||
        sub.fileSubmit.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [submissions, searchText]);

  const columns: TableProps<Submission>["columns"] = [
    {
      title: "No",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "File submit",
      dataIndex: "fileSubmit",
      key: "fileSubmit",
    },
    {
      title: "Student",
      dataIndex: "student",
      key: "student",
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => formatUtcDate(date, "dd/MM/yyyy"),
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
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
      render: (status) => getStatusTag(status),
    },
    {
      title: "Action",
      key: "action",
      render: () => <Button type="text" icon={<DownloadOutlined />} />,
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Space align="center" size="middle">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            size="large"
            style={{ margin: 0, padding: 0 }}
          />
          <Title level={2} style={{ margin: 0 }}>
            Submissions
          </Title>
        </Space>
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.spinner}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          className={styles.table}
        />
      )}
    </div>
  );
};

export default function SubmissionsPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <App>
      <SubmissionsPageContent shiftId={params.id} />
    </App>
  );
}
