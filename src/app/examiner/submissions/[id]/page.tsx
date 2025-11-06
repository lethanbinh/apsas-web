"use client";

import { Submission, submissionService } from "@/services/submissionService";
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { TableProps } from "antd";
import {
  Alert,
  App,
  Button,
  Input,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./Submissions.module.css";

const { Title } = Typography;

const formatUtcDate = (dateString: string, formatStr: string) => {
  if (!dateString) return "N/A";
  const date = new Date(
    dateString.endsWith("Z") ? dateString : dateString + "Z"
  );
  return format(date, formatStr);
};

const getStatusTag = (status: number) => {
  if (status === 0) {
    return <Tag color="green">On time</Tag>;
  }
  return <Tag color="red">Late</Tag>;
};

const SubmissionsPageContent = ({ shiftId }: { shiftId: string }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!shiftId) {
        setLoading(false);
        setError("No Exam Session ID provided.");
        return;
      }
      setLoading(true);
      try {
        const response = await submissionService.getSubmissionList({
          examSessionId: Number(shiftId),
        });
        setSubmissions(response);
      } catch (err: any) {
        console.error("Failed to fetch submissions:", err);
        setError(err.message || "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [shiftId]);

  const handleBack = () => {
    router.back();
  };

  const filteredData = useMemo(() => {
    return submissions.filter(
      (sub) =>
        sub.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
        sub.studentCode.toLowerCase().includes(searchText.toLowerCase()) ||
        sub.submissionFile?.name
          .toLowerCase()
          .includes(searchText.toLowerCase())
    );
  }, [submissions, searchText]);

  const columns: TableProps<Submission>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: "File Submit",
      dataIndex: "submissionFile",
      key: "fileSubmit",
      render: (file: Submission["submissionFile"]) => file?.name || "N/A",
    },
    {
      title: "Student",
      dataIndex: "studentName",
      key: "student",
      render: (name, record) => (
        <span>
          {name} ({record.studentCode})
        </span>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      render: (date) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
      sorter: (a, b) =>
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
    },
    {
      title: "Score",
      dataIndex: "lastGrade",
      key: "lastGrade",
      render: (score) => `${score}/100`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => getStatusTag(status),
    },
    {
      title: "Grader",
      dataIndex: "lecturerName",
      key: "lecturerName",
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          type="text"
          icon={<DownloadOutlined />}
          disabled={!record.submissionFile}
          href={record.submissionFile?.submissionUrl}
          target="_blank"
        />
      ),
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
          placeholder="Search by student, code, or filename..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.spinner}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
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
