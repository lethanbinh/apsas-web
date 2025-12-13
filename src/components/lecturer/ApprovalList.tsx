"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, Input, Table, Tag, Typography, Alert, Select, Space } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import styles from "./ApprovalList.module.css";
import { useRouter } from "next/navigation";
import { adminService } from "@/services/adminService"; 
import { ApiApprovalItem } from "@/types"; 
import { semesterService } from "@/services/semesterService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import type { TablePaginationConfig } from 'antd/es/table';
import { useAuth } from "@/hooks/useAuth";
import { lecturerService } from "@/services/lecturerService";

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


export default function LecturerApprovalList() {
  const [searchText, setSearchText] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<string | undefined>(undefined);
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<number | undefined>(undefined);
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string | undefined>(undefined);
  const router = useRouter();
  const { user } = useAuth();

  const [allApprovals, setAllApprovals] = useState<ApiApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allSemesters, setAllSemesters] = useState<any[]>([]);
  const [currentLecturerId, setCurrentLecturerId] = useState<number | null>(null);
  const [templatesWithRequestIds, setTemplatesWithRequestIds] = useState<Set<number>>(new Set());
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Get current lecturer ID
  useEffect(() => {
    const fetchLecturerId = async () => {
      if (user?.id) {
        try {
          const lecturers = await lecturerService.getLecturerList();
          const currentUserAccountId = String(user.id);
          const matchingLecturer = lecturers.find(
            (lec) => lec.accountId === currentUserAccountId
          );
          if (matchingLecturer) {
            setCurrentLecturerId(Number(matchingLecturer.lecturerId));
          }
        } catch (err) {
          console.error("Failed to fetch lecturer ID:", err);
        }
      }
    };
    fetchLecturerId();
  }, [user]);

  // Get unique semesters from all approvals, sorted by newest first
  const uniqueSemesters = useMemo(() => {
    const semesters = Array.from(new Set(allApprovals.map(a => a.semesterName).filter(Boolean)));
    
    // Create a map of semesterName to Semester object for sorting
    const semesterMap = new Map<string, any>();
    semesters.forEach((name) => {
      // Try exact match first
      const exactMatch = allSemesters.find((sem) => sem.semesterCode === name);
      if (exactMatch) {
        semesterMap.set(name, exactMatch);
        return;
      }
      
      // Try partial match (semesterName contains semesterCode or vice versa)
      const partialMatch = allSemesters.find((sem) => 
        name.includes(sem.semesterCode) || 
        sem.semesterCode.includes(name) ||
        name.toLowerCase().includes(sem.semesterCode.toLowerCase()) ||
        sem.semesterCode.toLowerCase().includes(name.toLowerCase())
      );
      if (partialMatch) {
        semesterMap.set(name, partialMatch);
      }
    });
    
    // Sort by startDate (newest first), or alphabetically if no date info
    const sortedSemesters = semesters.sort((a, b) => {
      const semA = semesterMap.get(a);
      const semB = semesterMap.get(b);
      
      if (semA && semB) {
        const dateA = new Date(semA.startDate.endsWith("Z") ? semA.startDate : semA.startDate + "Z");
        const dateB = new Date(semB.startDate.endsWith("Z") ? semB.startDate : semB.startDate + "Z");
        return dateB.getTime() - dateA.getTime(); // Newest first
      }
      if (semA) return -1; // A has date, B doesn't, A comes first
      if (semB) return 1; // B has date, A doesn't, B comes first
      // Both don't have dates, sort alphabetically (reverse for newest first)
      return b.localeCompare(a);
    });
    
    return sortedSemesters;
  }, [allApprovals, allSemesters]);

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

  // Reset pagination when status or template filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, [selectedStatus, selectedTemplateFilter]);

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
      if (!currentLecturerId) return; // Wait for lecturer ID
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all approvals, semesters, and templates in parallel
        const [approvalsResponse, semesters, templatesResponse] = await Promise.all([
          adminService.getApprovalList(1, 10000),
          semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
          assessmentTemplateService.getAssessmentTemplates({ pageNumber: 1, pageSize: 10000 })
        ]);
        
        // Filter approvals where assignedApproverLecturerId matches current lecturer ID
        const filteredApprovals = approvalsResponse.items.filter(
          (item) => item.assignedApproverLecturerId === currentLecturerId
        );
        
        setAllApprovals(filteredApprovals);
        setAllSemesters(semesters);
        
        // Create a set of assignRequestIds that have templates
        const templateRequestIds = new Set(
          templatesResponse.items
            .filter(t => t.assignRequestId)
            .map(t => t.assignRequestId)
        );
        setTemplatesWithRequestIds(templateRequestIds);
        
        // Set default to current semester
        if (selectedSemester === undefined) {
          const now = new Date();
          const currentSemester = semesters.find((sem) => {
            const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
            const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
            return now >= startDate && now <= endDate;
          });
          
          if (currentSemester) {
            // Get unique semester names from filtered approvals
            const uniqueSemesterNames = Array.from(
              new Set(filteredApprovals.map(a => a.semesterName).filter(Boolean))
            );
            
            // Find semesterName that matches current semester's semesterCode
            const matchingSemesterName = uniqueSemesterNames.find(
              name => name === currentSemester.semesterCode || 
                      name.startsWith(currentSemester.semesterCode) ||
                      name.includes(currentSemester.semesterCode)
            );
            
            // If found matching semesterName, use it
            if (matchingSemesterName) {
              setSelectedSemester(matchingSemesterName);
            }
          }
        }
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
  }, [currentLecturerId]); 

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
      
      // Template filter
      const matchesTemplate = !selectedTemplateFilter || 
        (selectedTemplateFilter === "with" && templatesWithRequestIds.has(item.id)) ||
        (selectedTemplateFilter === "without" && !templatesWithRequestIds.has(item.id));
      
      return matchesSearch && matchesSemester && matchesCourse && matchesStatus && matchesTemplate;
    });
  }, [allApprovals, searchText, selectedSemester, selectedCourse, selectedStatus, selectedTemplateFilter, templatesWithRequestIds]);

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
    router.push(`/lecturer/approval/${record.id}`);
  };

  const handleTableChange: TableProps<ApiApprovalItem>['onChange'] = (newPagination) => {
    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  };

  if (!currentLecturerId && !loading) {
    return (
      <Alert
        message="Error"
        description="Unable to identify lecturer account. Please ensure you are logged in as a lecturer."
        type="error"
        showIcon
      />
    );
  }

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
          <Select
            placeholder="Filter by Template"
            allowClear
            style={{ minWidth: 150 }}
            value={selectedTemplateFilter}
            onChange={(value) => {
              setSelectedTemplateFilter(value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            options={[
              { label: "With Template", value: "with" },
              { label: "Without Template", value: "without" },
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

