"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, Input, Table, Tag, Typography, Alert, Select, Space } from "antd";
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
      return { color: "warning", text: "Pending", displayValue: 1 };
    case 2: // ACCEPTED -> map to Pending
      return { color: "warning", text: "Pending", displayValue: 1 };
    case 3: // REJECTED
      return { color: "error", text: "Rejected", displayValue: 3 };
    case 4: // IN_PROGRESS -> map to Pending
      return { color: "warning", text: "Pending", displayValue: 1 };
    case 5: // COMPLETED -> Approved
      return { color: "success", text: "Approved", displayValue: 5 };
    default:
      return { color: "default", text: "Pending", displayValue: 1 };
  }
};


export default function ApprovalList() {
  const [searchText, setSearchText] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<string | undefined>(undefined);
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<number | undefined>(undefined);
  const router = useRouter();

  const [allApprovals, setAllApprovals] = useState<ApiApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Get unique semesters from all approvals
  const uniqueSemesters = useMemo(() => {
    const semesters = Array.from(new Set(allApprovals.map(a => a.semesterName).filter(Boolean)));
    return semesters.sort();
  }, [allApprovals]);

  // Get unique courses from all approvals, filtered by selected semester
  const uniqueCourses = useMemo(() => {
    let filteredApprovals = allApprovals;
    if (selectedSemester) {
      filteredApprovals = allApprovals.filter(a => a.semesterName === selectedSemester);
    }
    const courses = Array.from(new Set(filteredApprovals.map(a => a.courseName).filter(Boolean)));
    return courses.sort();
  }, [allApprovals, selectedSemester]);

  // Reset course selection when semester changes
  useEffect(() => {
    if (selectedSemester) {
      const coursesInSemester = allApprovals
        .filter(a => a.semesterName === selectedSemester)
        .map(a => a.courseName)
        .filter(Boolean);
      
      if (selectedCourse && !coursesInSemester.includes(selectedCourse)) {
        setSelectedCourse(undefined);
      }
    } else {
      setSelectedCourse(undefined);
    }
    // Reset pagination when filters change
    setPagination(prev => ({ ...prev, current: 1 }));
  }, [selectedSemester, allApprovals, selectedCourse]);

  // Reset pagination when status filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, [selectedStatus]);

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
      title: "Course",
      dataIndex: "courseName",
      key: "course",
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
    },
  ];

  useEffect(() => {
    const fetchAllApprovals = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all approvals (use large pageSize to get all data)
        const response = await adminService.getApprovalList(1, 10000);
        
        setAllApprovals(response.items);
      } catch (err: any) {
        console.error("Failed to fetch approvals:", err);
        const apiError = err.response?.data?.errorMessages?.[0] || err.message || "Failed to load approval data.";
        setError(apiError);
        setAllApprovals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllApprovals();
  }, []); 

  // Filter all data first
  const filteredData = useMemo(() => {
    return allApprovals.filter((item) => {
      // Search filter
      const matchesSearch = 
        item.courseElementName.toLowerCase().includes(searchText.toLowerCase()) ||
        item.courseName.toLowerCase().includes(searchText.toLowerCase()) ||
        item.assignedLecturerName.toLowerCase().includes(searchText.toLowerCase());
      
      // Semester filter
      const matchesSemester = !selectedSemester || item.semesterName === selectedSemester;
      
      // Course filter
      const matchesCourse = !selectedCourse || item.courseName === selectedCourse;
      
      // Status filter - map status to display value
      let matchesStatus = true;
      if (selectedStatus !== undefined) {
        const statusProps = getStatusProps(item.status);
        if (selectedStatus === 1) {
          // Pending: status 1, 2, 4
          matchesStatus = item.status === 1 || item.status === 2 || item.status === 4;
        } else if (selectedStatus === 3) {
          // Rejected: status 3
          matchesStatus = item.status === 3;
        } else if (selectedStatus === 5) {
          // Approved: status 5
          matchesStatus = item.status === 5;
        } else {
          matchesStatus = statusProps.displayValue === selectedStatus;
        }
      }
      
      return matchesSearch && matchesSemester && matchesCourse && matchesStatus;
    });
  }, [allApprovals, searchText, selectedSemester, selectedCourse, selectedStatus]);

  // Paginate filtered data (client-side pagination)
  const paginatedData = useMemo(() => {
    const start = ((pagination.current || 1) - 1) * (pagination.pageSize || 10);
    const end = start + (pagination.pageSize || 10);
    return filteredData.slice(start, end);
  }, [filteredData, pagination.current, pagination.pageSize]);

  // Update pagination total when filtered data changes
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: filteredData.length,
    }));
  }, [filteredData.length]);

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
        <Space size="middle" style={{ display: "flex", flexWrap: "wrap" }}>
          <Select
            placeholder="Filter by Semester"
            allowClear
            style={{ minWidth: 200 }}
            value={selectedSemester}
            onChange={(value) => {
              setSelectedSemester(value);
              setSelectedCourse(undefined); // Reset course when semester changes
            }}
            options={uniqueSemesters.map(semester => ({
              label: semester,
              value: semester,
            }))}
          />
          <Select
            placeholder="Filter by Course"
            allowClear
            disabled={!selectedSemester}
            style={{ minWidth: 200 }}
            value={selectedCourse}
            onChange={(value) => {
              setSelectedCourse(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            options={uniqueCourses.map(course => ({
              label: course,
              value: course,
            }))}
          />
          <Select
            placeholder="Filter by Status"
            allowClear
            style={{ minWidth: 150 }}
            value={selectedStatus}
            onChange={(value) => {
              setSelectedStatus(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            options={[
              { label: "Pending", value: 1 },
              { label: "Approved", value: 5 },
              { label: "Rejected", value: 3 },
            ]}
          />
          <Input
            placeholder="Search by name or teacher..."
            onChange={(e) => {
              setSearchText(e.target.value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            className={styles.searchBar}
            prefix={<SearchOutlined />}
            style={{ minWidth: 250 }}
          />
        </Space>
      </div>

      {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}

      <Card className={styles.approvalCard}>
        <Table
          columns={columns}
          dataSource={paginatedData}
          rowKey="id" 
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
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