"use client";

import { GradingGroup } from "@/services/gradingGroupService";
import { Button, Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

const { Text } = Typography;

export interface FlatGradingGroup {
  key: string;
  id: number;
  courseCode: string;
  courseName: string;
  templateName: string;
  semesterCode: string;
  submissionCount: number;
  gradingGroupIds: number[];
  gradingGroup: GradingGroup;
  isSemesterPassed: boolean;
}

interface GradingGroupTableProps {
  dataSource: FlatGradingGroup[];
  columns?: ColumnsType<FlatGradingGroup>;
}

export function GradingGroupTable({ dataSource, columns }: GradingGroupTableProps) {
  const router = useRouter();

  const defaultColumns: ColumnsType<FlatGradingGroup> = useMemo(() => [
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
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => router.push(`/lecturer/grading-group/${record.id}`)}
          size="small"
          disabled={record.isSemesterPassed}
        >
          Manage
        </Button>
      ),
    },
  ], [router]);

  const tableColumns = columns || defaultColumns;

  if (dataSource.length === 0) {
    return (
      <Empty
        description="No teacher assignments found"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <Table
      columns={tableColumns}
      dataSource={dataSource}
      rowKey="key"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} teacher assignments`,
      }}
      scroll={{ x: 800 }}
    />
  );
}

