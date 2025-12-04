"use client";

import { GradingGroup } from "@/services/gradingGroupService";
import { Alert, Button, Empty, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { TableProps } from "antd";
import { DeleteOutlined, DownloadOutlined, UserAddOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Text } = Typography;

export interface FlatGradingGroup {
  id: number;
  courseCode: string;
  courseName: string;
  templateName: string;
  lecturerNames: string[];
  lecturerCodes: (string | null)[];
  semesterCode?: string;
  submissionCount: number;
  groupIds: number[];
  group: GradingGroup & { subs: any[]; semesterCode?: string };
}

interface GradingGroupTableProps {
  dataSource: FlatGradingGroup[];
  onAssign: (group: GradingGroup) => void;
  onDelete: (group: GradingGroup) => void;
  columns?: TableProps<FlatGradingGroup>["columns"];
}

export function GradingGroupTable({ dataSource, onAssign, onDelete, columns }: GradingGroupTableProps) {
  const defaultColumns: TableProps<FlatGradingGroup>["columns"] = [
    {
      title: "Course",
      key: "course",
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{record.courseCode}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.courseName}
          </Text>
        </div>
      ),
    },
    {
      title: "Template",
      dataIndex: "templateName",
      key: "template",
      width: 200,
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: "Lecturer",
      key: "lecturer",
      width: 200,
      render: (_, record) => (
        <div>
          {record.lecturerNames.length > 0 && (
            <>
              <Text strong>{record.lecturerNames.join(", ")}</Text>
              {record.lecturerCodes.some(code => code) && (
                <>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {record.lecturerCodes.filter(code => code).join(", ")}
                  </Text>
                </>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      title: "Semester",
      dataIndex: "semesterCode",
      key: "semester",
      width: 120,
      render: (semester) => semester ? (
        <Tag color="purple">{semester}</Tag>
      ) : (
        <Text type="secondary">N/A</Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => onAssign(record.group)}
            size="small"
                    >
                      Manage
                    </Button>
          <Popconfirm
            title="Delete Assignment"
            description={`Are you sure you want to delete this assignment?`}
            onConfirm={() => onDelete(record.group)}
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
        </Space>
      ),
    },
  ];

  const tableColumns = columns || defaultColumns;

  if (dataSource.length === 0) {
    return (
      <Empty
        description="No grading groups found"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Table
      columns={tableColumns}
      dataSource={dataSource}
      rowKey="id"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} assignments`,
      }}
      scroll={{ x: 1000 }}
      expandable={{
        expandedRowRender: (record) => (
          <div style={{ padding: '16px 0' }}>
            {record.group.submittedGradeSheetUrl ? (
              <Space direction="vertical" size="small">
                <Text strong>Grade Sheet:</Text>
                <Button
                  type="link"
                  icon={<DownloadOutlined />}
                  href={record.group.submittedGradeSheetUrl}
                  target="_blank"
                  style={{ padding: 0 }}
                >
                  Download Grade Sheet
                </Button>
                {record.group.gradeSheetSubmittedAt && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Submitted at: {dayjs.utc(record.group.gradeSheetSubmittedAt).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")}
                  </Text>
                )}
              </Space>
            ) : (
              <Alert
                message="No grade sheet submitted yet"
                type="info"
                showIcon
              />
            )}
          </div>
        ),
        rowExpandable: () => true,
      }}
    />
  );
}

