"use client";

import type { TableProps } from "antd";
import { Button, Space, Table, Tag, Tooltip, Typography } from "antd";
import { AssignRequest } from "@/services/semesterService";
import { formatUtcDate } from "../utils";

const { Text } = Typography;

interface AssignRequestsTableProps {
  requests: AssignRequest[];
  onEdit: (request: AssignRequest) => void;
  onDelete: (requestId: number) => void;
  isSemesterEnded?: boolean;
}

export const AssignRequestsTable = ({
  requests,
  onEdit,
  onDelete,
  isSemesterEnded = false,
}: AssignRequestsTableProps) => {
  const getStatusDisplay = (status: number | undefined) => {
    if (status === undefined || status === null) return { text: "Pending", color: "default" };

    switch (status) {
      case 1:
      case 2:
      case 4:
        return { text: "Pending", color: "default" };
      case 5:
        return { text: "Approved", color: "success" };
      case 3:
        return { text: "Rejected", color: "error" };
      default:
        return { text: "Pending", color: "default" };
    }
  };

  const isApproved = (status: number | undefined) => {
    return status === 5;
  };

  const columns: TableProps<AssignRequest>["columns"] = [
    {
      title: "Course Element",
      dataIndex: ["courseElement", "name"],
      key: "element",
    },
    {
      title: "Assigned Lecturer",
      dataIndex: ["lecturer", "account", "fullName"],
      key: "lecturer",
      render: (name: string, record: AssignRequest) => (
        <Space direction="vertical" size={0}>
          <span>{name}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.lecturer.account.accountCode || "N/A"} | {record.lecturer.department || "N/A"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, record: AssignRequest) => {
        const status = (record as any).status as number | undefined;
        const statusDisplay = getStatusDisplay(status);
        return <Tag color={statusDisplay.color}>{statusDisplay.text}</Tag>;
      },
    },
    {
      title: "Message",
      dataIndex: "message",
      key: "message",
      render: (message: string) => (
        <div style={{ wordBreak: "break-word", whiteSpace: "normal", maxWidth: 300 }}>
          {message || "N/A"}
        </div>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "created",
      render: (date: string) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
    },
    {
      title: "Updated At",
      dataIndex: "updatedAt",
      key: "updated",
      render: (date: string) => formatUtcDate(date, "dd/MM/yyyy HH:mm"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        const status = (record as any).status as number | undefined;
        const approved = isApproved(status);
        const isEditDisabled = isSemesterEnded || approved;
        const isDeleteDisabled = isSemesterEnded || approved;

        const editTooltipTitle = isEditDisabled
          ? approved
            ? "This assign request has been approved. Editing is not allowed."
            : "The semester has ended. Editing is not allowed."
          : "";

        const deleteTooltipTitle = isDeleteDisabled
          ? approved
            ? "This assign request has been approved. Deletion is not allowed."
            : "The semester has ended. Deletion is not allowed."
          : "";

        const editButton = (
          <Button
            type="link"
            onClick={() => onEdit(record)}
            disabled={isEditDisabled}
          >
            Edit
          </Button>
        );

        const deleteButton = (
          <Button
            type="link"
            danger
            onClick={() => onDelete(record.id)}
            disabled={isDeleteDisabled}
          >
            Delete
          </Button>
        );

        return (
          <Space>
            {isEditDisabled ? (
              <Tooltip title={editTooltipTitle}>
                <span>{editButton}</span>
              </Tooltip>
            ) : (
              editButton
            )}
            {isDeleteDisabled ? (
              <Tooltip title={deleteTooltipTitle}>
                <span>{deleteButton}</span>
              </Tooltip>
            ) : (
              deleteButton
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={requests}
      rowKey="id"
      pagination={{ pageSize: 5, hideOnSinglePage: true }}
      scroll={{ x: 'max-content' }}
    />
  );
};

