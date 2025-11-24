"use client";

import React, { useState, useEffect } from "react";
import { Card, Input, Table, Tag, Typography, Alert } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import styles from "./ApprovalList.module.css";
import { useRouter } from "next/navigation";
import { adminService } from "@/services/adminService"; 
import { ApiApprovalItem } from "@/types"; 
import type { TablePaginationConfig } from 'antd/es/table';

const { Title, Text } = Typography;

const getStatusProps = (status: number) => {
  switch (status) {
    case 1: // PENDING
      return { color: "warning", text: "Pending" };
    case 2: // ACCEPTED
      return { color: "processing", text: "Accepted" };
    case 3: // REJECTED
      return { color: "error", text: "Rejected" };
    case 4: // IN_PROGRESS
      return { color: "processing", text: "In Progress" };
    case 5: // COMPLETED (coi là Approved)
      return { color: "success", text: "Approved" };
    default:
      return { color: "default", text: `Unknown (${status})` };
  }
};


export default function ApprovalList() {
  const [searchText, setSearchText] = useState("");
  const router = useRouter();

  const [approvals, setApprovals] = useState<ApiApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const columns: TableProps<ApiApprovalItem>["columns"] = [
    {
      title: "No",
      key: "no",
      render: (text, record, index) => 
        ((pagination.current || 1) - 1) * (pagination.pageSize || 10) + index + 1,
      width: 60,
    },
    {
      title: "Name",
      dataIndex: "courseElementName", 
      key: "name",
      render: (text, record) => (
        <Text strong>
          {record.courseName} - {text}
        </Text>
      ),
    },
    {
      title: "Teacher",
      dataIndex: "assignedLecturerName", 
      key: "teacher",
      sorter: (a, b) => a.assignedLecturerName.localeCompare(b.assignedLecturerName),
    },
    {
      title: "Date",
      dataIndex: "createdAt", 
      key: "date",
      render: (text: string) => new Date(text).toLocaleDateString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric" 
      }),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Semester",
      dataIndex: "semesterName", 
      key: "semester",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: number) => {
        const { color, text } = getStatusProps(status); 
        return <Tag color={color} className={styles.statusTag}>{text}</Tag>;
      },
      filters: [
        { text: "Pending", value: 1 },
        { text: "Accepted", value: 2 },
        { text: "Rejected", value: 3 },
        { text: "In Progress", value: 4 },
        { text: "Approved", value: 5 }, 
      ],
      onFilter: (value, record) => record.status === value,
    },
  ];

  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching approvals with params:", pagination.current, pagination.pageSize);
        const response = await adminService.getApprovalList(
          pagination.current || 1,
          pagination.pageSize || 10
        );
        console.log("API Response:", response);
        
        setApprovals(response.items);
        setPagination(prev => ({
          ...prev,
          total: response.totalCount,
        }));
      } catch (err: any) {
        console.error("Failed to fetch approvals:", err);
        const apiError = err.response?.data?.errorMessages?.[0] || err.message || "Failed to load approval data.";
        setError(apiError);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, [pagination.current, pagination.pageSize]); 

  const filteredData = approvals.filter(
    (item) =>
      item.courseElementName.toLowerCase().includes(searchText.toLowerCase()) ||
      item.courseName.toLowerCase().includes(searchText.toLowerCase()) ||
      item.assignedLecturerName.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleRowClick = (record: ApiApprovalItem) => {
    router.push(`/hod/approval/${record.id}`);
  };

  const handleTableChange: TableProps<ApiApprovalItem>['onChange'] = (newPagination) => {
    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

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
          Approval
        </Title>
        <Input
          placeholder="Search by name or teacher..."
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.searchBar}
          prefix={<SearchOutlined />}
        />
      </div>

      {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      <Card className={styles.approvalCard}>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id" 
          loading={loading}
          pagination={pagination} 
          onChange={handleTableChange} 
          className={styles.approvalTable}
          onRow={(record) => {
            return {
              onClick: () => handleRowClick(record),
              style: { cursor: "pointer" },
            };
          }}
        />
      </Card>
    </div>
  );
}