import { Button, Empty, Table, Tag, Typography } from "antd";
import { EditOutlined, FileTextOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import type { Submission } from "@/services/submissionService";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Text } = Typography;

interface SubmissionsTableProps {
  submissions: Submission[];
  submissionTotalScores: Record<number, number>;
  onEdit: (submission: Submission) => void;
}

export function SubmissionsTable({
  submissions,
  submissionTotalScores,
  onEdit,
}: SubmissionsTableProps) {
  const columns: TableProps<Submission>["columns"] = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      align: "center",
    },
    {
      title: "Student",
      key: "student",
      width: 200,
      render: (_: any, record: Submission) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{record.studentName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.studentCode}
          </Text>
        </div>
      ),
    },
    {
      title: "Submission File",
      key: "file",
      width: 200,
      render: (_: any, record: Submission) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined />
          <span>{record.submissionFile?.name || "N/A"}</span>
        </div>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "updatedAt",
      key: "submittedAt",
      width: 180,
      render: (_: any, record: Submission) => {
        const date = record.updatedAt || record.submittedAt;
        return date
          ? dayjs.utc(date).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")
          : "N/A";
      },
    },
    {
      title: "Score",
      key: "score",
      width: 120,
      align: "center",
      render: (_, record) => {
        const totalScore = submissionTotalScores[record.id];
        if (totalScore !== undefined && totalScore !== null) {
          return (
            <Tag color="green" style={{ fontSize: 14, fontWeight: 600 }}>
              {totalScore.toFixed(2)}
            </Tag>
          );
        }
        return (
          <Tag color="default">Not graded</Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right",
      align: "center",
      render: (_: any, record: Submission) => (
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => onEdit(record)}
          size="small"
        >
          Edit
        </Button>
      ),
    },
  ];

  if (submissions.length === 0) {
    return (
      <Empty
        description="No submissions found"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={submissions}
      rowKey="id"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} submissions`,
      }}
      scroll={{ x: 1000 }}
      onRow={(record) => ({
        onClick: () => onEdit(record),
        style: { cursor: 'pointer' },
      })}
    />
  );
}

