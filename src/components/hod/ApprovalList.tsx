"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, Input, Table, Tag, Typography, Alert, Select, Space, Button, Drawer } from "antd";
import type { TableProps } from "antd";
import { SearchOutlined, FilterOutlined } from "@ant-design/icons";
import styles from "./ApprovalList.module.css";
import { useRouter } from "next/navigation";
import { adminService } from "@/services/adminService";
import { ApiApprovalItem } from "@/types";
import { semesterService } from "@/services/semesterService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import type { TablePaginationConfig } from 'antd/es/table';

const { Title, Text } = Typography;

const getStatusProps = (status: number) => {
  switch (status) {
    case 1:
      return { color: "warning", text: "Pending", displayValue: 1 };
    case 2:
      return { color: "warning", text: "Pending", displayValue: 1 };
    case 3:
      return { color: "error", text: "Rejected", displayValue: 3 };
    case 4:
      return { color: "warning", text: "Pending", displayValue: 1 };
    case 5:
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
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string | undefined>(undefined);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const router = useRouter();

  const [allApprovals, setAllApprovals] = useState<ApiApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allSemesters, setAllSemesters] = useState<any[]>([]);
  const [templatesWithRequestIds, setTemplatesWithRequestIds] = useState<Set<number>>(new Set());
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0,
  });


  const uniqueSemesters = useMemo(() => {
    const semesters = Array.from(new Set(allApprovals.map(a => a.semesterName).filter(Boolean)));


    const semesterMap = new Map<string, any>();
    semesters.forEach((name) => {

      const exactMatch = allSemesters.find((sem) => sem.semesterCode === name);
      if (exactMatch) {
        semesterMap.set(name, exactMatch);
        return;
      }


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


    const sortedSemesters = semesters.sort((a, b) => {
      const semA = semesterMap.get(a);
      const semB = semesterMap.get(b);

      if (semA && semB) {
        const dateA = new Date(semA.startDate.endsWith("Z") ? semA.startDate : semA.startDate + "Z");
        const dateB = new Date(semB.startDate.endsWith("Z") ? semB.startDate : semB.startDate + "Z");
        return dateB.getTime() - dateA.getTime();
      }
      if (semA) return -1;
      if (semB) return 1;

      return b.localeCompare(a);
    });

    return sortedSemesters;
  }, [allApprovals, allSemesters]);


  const uniqueCourses = useMemo(() => {
    let filteredApprovals = allApprovals;
    if (selectedSemester) {
      filteredApprovals = allApprovals.filter(a => a.semesterName === selectedSemester);
    }
    const courses = Array.from(new Set(filteredApprovals.map(a => a.courseName).filter(Boolean)));
    return courses.sort();
  }, [allApprovals, selectedSemester]);


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

    setPagination(prev => ({ ...prev, current: 1 }));
  }, [selectedSemester, allApprovals, selectedCourse]);


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
      try {
        setLoading(true);
        setError(null);


        const [approvalsResponse, semesters, templatesResponse] = await Promise.all([
          adminService.getApprovalList(1, 10000),
          semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
          assessmentTemplateService.getAssessmentTemplates({ pageNumber: 1, pageSize: 10000 })
        ]);

        setAllApprovals(approvalsResponse.items);
        setAllSemesters(semesters);


        const templateRequestIds = new Set(
          templatesResponse.items
            .filter(t => t.assignRequestId)
            .map(t => t.assignRequestId)
        );
        setTemplatesWithRequestIds(templateRequestIds);


        if (selectedSemester === undefined) {
          const now = new Date();
          const currentSemester = semesters.find((sem) => {
            const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
            const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
            return now >= startDate && now <= endDate;
          });

          if (currentSemester) {

            const uniqueSemesterNames = Array.from(
              new Set(approvalsResponse.items.map(a => a.semesterName).filter(Boolean))
            );



            const matchingSemesterName = uniqueSemesterNames.find(
              name => name === currentSemester.semesterCode ||
                      name.startsWith(currentSemester.semesterCode) ||
                      name.includes(currentSemester.semesterCode)
            );


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
  }, []);


  const filteredData = useMemo(() => {
    return allApprovals.filter((item) => {

      const matchesSearch =
        item.courseElementName.toLowerCase().includes(searchText.toLowerCase()) ||
        item.courseName.toLowerCase().includes(searchText.toLowerCase()) ||
        item.assignedLecturerName.toLowerCase().includes(searchText.toLowerCase());


      const matchesSemester = !selectedSemester || item.semesterName === selectedSemester;


      const matchesCourse = !selectedCourse || item.courseName === selectedCourse;


      let matchesStatus = true;
      if (selectedStatus !== undefined) {
        const statusProps = getStatusProps(item.status);
        if (selectedStatus === 1) {

          matchesStatus = item.status === 1 || item.status === 2 || item.status === 4;
        } else if (selectedStatus === 3) {

          matchesStatus = item.status === 3;
        } else if (selectedStatus === 5) {

          matchesStatus = item.status === 5;
        } else {
          matchesStatus = statusProps.displayValue === selectedStatus;
        }
      }


      const matchesTemplate = !selectedTemplateFilter ||
        (selectedTemplateFilter === "with" && templatesWithRequestIds.has(item.id)) ||
        (selectedTemplateFilter === "without" && !templatesWithRequestIds.has(item.id));

      return matchesSearch && matchesSemester && matchesCourse && matchesStatus && matchesTemplate;
    });
  }, [allApprovals, searchText, selectedSemester, selectedCourse, selectedStatus, selectedTemplateFilter, templatesWithRequestIds]);


  const paginatedData = useMemo(() => {
    const start = ((pagination.current || 1) - 1) * (pagination.pageSize || 10);
    const end = start + (pagination.pageSize || 10);
    return filteredData.slice(start, end);
  }, [filteredData, pagination.current, pagination.pageSize]);


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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSemester) count++;
    if (selectedCourse) count++;
    if (selectedStatus !== undefined) count++;
    if (selectedTemplateFilter) count++;
    return count;
  }, [selectedSemester, selectedCourse, selectedStatus, selectedTemplateFilter]);

  const handleClearAllFilters = () => {
    setSelectedSemester(undefined);
    setSelectedCourse(undefined);
    setSelectedStatus(undefined);
    setSelectedTemplateFilter(undefined);
    setPagination(prev => ({ ...prev, current: 1 }));
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
        <div className={styles.filterBar}>
          <Input
            placeholder="Search by name or teacher..."
            onChange={(e) => {
              setSearchText(e.target.value);
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            className={styles.searchBar}
            prefix={<SearchOutlined />}
            value={searchText}
          />
          <Button
            type="default"
            icon={<FilterOutlined />}
            onClick={() => setFilterDrawerOpen(true)}
            className={styles.filterButton}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </Button>
        </div>
      </div>

      {activeFilterCount > 0 && (
        <div className={styles.activeFilters}>
          <Space size="small" wrap>
            {selectedSemester && (
              <Tag
                closable
                onClose={() => {
                  setSelectedSemester(undefined);
                  setSelectedCourse(undefined);
                }}
                color="blue"
              >
                Semester: {selectedSemester}
              </Tag>
            )}
            {selectedCourse && (
              <Tag
                closable
                onClose={() => setSelectedCourse(undefined)}
                color="blue"
              >
                Course: {selectedCourse}
              </Tag>
            )}
            {selectedStatus !== undefined && (
              <Tag
                closable
                onClose={() => setSelectedStatus(undefined)}
                color="blue"
              >
                Status: {selectedStatus === 1 ? "Pending" : selectedStatus === 5 ? "Approved" : "Rejected"}
              </Tag>
            )}
            {selectedTemplateFilter && (
              <Tag
                closable
                onClose={() => setSelectedTemplateFilter(undefined)}
                color="blue"
              >
                Template: {selectedTemplateFilter === "with" ? "With Template" : "Without Template"}
              </Tag>
            )}
            <Button type="link" size="small" onClick={handleClearAllFilters}>
              Clear all
            </Button>
          </Space>
        </div>
      )}

      <Drawer
        title="Filter Options"
        placement="right"
        onClose={() => setFilterDrawerOpen(false)}
        open={filterDrawerOpen}
        width={400}
        className={styles.filterDrawer}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Semester
            </Text>
          <Select
              placeholder="Select semester"
            allowClear
              style={{ width: "100%" }}
            value={selectedSemester}
            onChange={(value) => {
              setSelectedSemester(value);
              setSelectedCourse(undefined);
            }}
            options={uniqueSemesters.map(semester => ({
              label: semester,
              value: semester,
            }))}
          />
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Course
            </Text>
          <Select
              placeholder="Select course"
            allowClear
            disabled={!selectedSemester}
              style={{ width: "100%" }}
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
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Status
            </Text>
          <Select
              placeholder="Select status"
            allowClear
              style={{ width: "100%" }}
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
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Template
            </Text>
          <Select
              placeholder="Select template filter"
            allowClear
              style={{ width: "100%" }}
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
          </div>

          <Button
            type="default"
            block
            onClick={handleClearAllFilters}
            style={{ marginTop: 16 }}
          >
            Clear All Filters
          </Button>
        </Space>
      </Drawer>

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