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
  Typography,
} from "antd";
import { useRouter, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./Submissions.module.css";
const { Title } = Typography;
const SubmissionsPageContent = ({ shiftId }: { shiftId: string }) => {
  const [searchText, setSearchText] = useState("");
  const router = useRouter();
  const { data: submissions = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['submissions', 'byExamSessionId', shiftId],
    queryFn: () => submissionService.getSubmissionList({
      examSessionId: Number(shiftId),
    }),
    enabled: !!shiftId,
  });
  const error = queryError ? (queryError as any).message || "Failed to load data." : null;
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
      {loading && submissions.length === 0 ? (
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
export default function SubmissionsPage() {
  const params = useParams();
  const shiftId = params.id as string;
  return (
    <App>
      <SubmissionsPageContent shiftId={shiftId} />
    </App>
  );
}