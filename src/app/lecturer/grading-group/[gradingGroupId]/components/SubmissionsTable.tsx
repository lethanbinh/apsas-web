import { Button, Empty, Popconfirm, Table, Tag, Typography } from "antd";
import { EditOutlined, FileTextOutlined, DeleteOutlined } from "@ant-design/icons";
import type { TableProps } from "antd";
import type { Submission } from "@/services/submissionService";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useState, useEffect } from "react";
dayjs.extend(utc);
dayjs.extend(timezone);
const { Text } = Typography;
interface SubmissionsTableProps {
  submissions: Submission[];
  submissionTotalScores: Record<number, number>;
  maxScore: number;
  onEdit?: (submission: Submission) => void;
  onDelete?: (submission: Submission) => void;
  isGradeSheetSubmitted: boolean;
  onSelectionChange?: (selectedRowKeys: React.Key[], selectedRows: Submission[]) => void;
  selectedRowKeys?: React.Key[];
  maxSelection?: number;
  filteredSubmissions?: Submission[];
}
export function SubmissionsTable({
  submissions,
  submissionTotalScores,
  maxScore,
  onEdit,
  onDelete,
  isGradeSheetSubmitted,
  onSelectionChange,
  selectedRowKeys: externalSelectedRowKeys,
  maxSelection = 10,
  filteredSubmissions,
}: SubmissionsTableProps) {
  const [internalSelectedRowKeys, setInternalSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedRowKeys = externalSelectedRowKeys !== undefined ? externalSelectedRowKeys : internalSelectedRowKeys;
  const displaySubmissions = filteredSubmissions || submissions;
  useEffect(() => {
    if (externalSelectedRowKeys !== undefined) {
      setInternalSelectedRowKeys(externalSelectedRowKeys);
    }
  }, [externalSelectedRowKeys]);
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
              {maxScore > 0 ? `${totalScore.toFixed(2)}/${maxScore.toFixed(2)}` : totalScore.toFixed(2)}
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
      render: (_: any, record: Submission) => {
        if (onDelete) {
          return (
            <Popconfirm
              title="Delete Submission"
              description={`Are you sure you want to delete this submission?`}
              onConfirm={() => onDelete(record)}
              okText="Delete"
              cancelText="Cancel"
              okType="danger"
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
              >
                Delete
              </Button>
            </Popconfirm>
          );
        }
        if (onEdit) {
          return (
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => onEdit(record)}
          size="small"
          disabled={isGradeSheetSubmitted}
        >
          Edit
        </Button>
          );
        }
        return null;
      },
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
  const rowSelection = onSelectionChange ? {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[], selectedRows: Submission[]) => {
      if (newSelectedRowKeys.length > maxSelection) {
        return;
      }
      if (externalSelectedRowKeys === undefined) {
        setInternalSelectedRowKeys(newSelectedRowKeys);
      }
      onSelectionChange(newSelectedRowKeys, selectedRows);
    },
    getCheckboxProps: (record: Submission) => ({
      disabled: selectedRowKeys.length >= maxSelection && !selectedRowKeys.includes(record.id),
    }),
  } : undefined;
  return (
    <Table
      columns={columns}
      dataSource={displaySubmissions}
      rowKey="id"
      rowSelection={rowSelection}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} submissions`,
      }}
      scroll={{ x: 1000 }}
      onRow={(record) => ({
        onClick: (e) => {
          if ((e.target as HTMLElement).closest('.ant-checkbox-wrapper')) {
            return;
          }
          if (onEdit && !isGradeSheetSubmitted) {
            onEdit(record);
          }
        },
        style: { cursor: (onEdit && !isGradeSheetSubmitted) ? 'pointer' : 'default' },
      })}
    />
  );
}