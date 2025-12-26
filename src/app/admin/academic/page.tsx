"use client";
import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { queryKeys } from "@/lib/react-query";
import { adminService } from "@/services/adminService";
import { classService } from "@/services/classService";
import { ArrowLeftOutlined, BookOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, DatePicker, Row, Select, Space, Statistic, Table, Tag, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import styles from "../dashboard/DashboardAdmin.module.css";
const { Title } = Typography;
const { RangePicker } = DatePicker;
const COLORS = {
  blue: "#2563EB",
  green: "#10B981",
  purple: "#6D28D9",
  orange: "#F59E0B",
  red: "#EF4444",
};
const AcademicPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedSemester, setSelectedSemester] = useState<string | undefined>(undefined);
  const [semesterDateRange, setSemesterDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [classDateRange, setClassDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const { data: semestersRes, isLoading: semestersLoading } = useQuery({
    queryKey: queryKeys.semesters.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => adminService.getPaginatedSemesters(1, 100),
  });
  const { data: classesRes, isLoading: classesLoading } = useQuery({
    queryKey: queryKeys.classes.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
  });
  const semesters = semestersRes || [];
  const classes = classesRes?.classes || [];
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [queryKeys.semesters.list({ pageNumber: 1, pageSize: 1000 })] });
    queryClient.invalidateQueries({ queryKey: [queryKeys.classes.list({ pageNumber: 1, pageSize: 1000 })] });
  };
  const filteredSemesters = useMemo(() => {
    let filtered = [...semesters];
    if (semesterDateRange && semesterDateRange[0] && semesterDateRange[1]) {
      filtered = filtered.filter((sem) => {
        const startDate = dayjs(sem.startDate);
        const endDate = dayjs(sem.endDate);
        const filterStart = semesterDateRange[0]!.startOf("day");
        const filterEnd = semesterDateRange[1]!.endOf("day");
        return (
          (startDate.isBefore(filterEnd) || startDate.isSame(filterEnd)) &&
          (endDate.isAfter(filterStart) || endDate.isSame(filterStart))
        );
      });
    }
    return filtered;
  }, [semesters, semesterDateRange?.[0]?.valueOf(), semesterDateRange?.[1]?.valueOf()]);
  const filteredClasses = useMemo(() => {
    let filtered = [...classes];
    if (selectedSemester) {
      filtered = filtered.filter((cls) => {
        if (cls.semesterName === selectedSemester) {
          return true;
        }
        if (cls.semesterName && selectedSemester) {
          return cls.semesterName.includes(selectedSemester) ||
                 selectedSemester.includes(cls.semesterName) ||
                 cls.semesterName.toLowerCase().includes(selectedSemester.toLowerCase()) ||
                 selectedSemester.toLowerCase().includes(cls.semesterName.toLowerCase());
        }
        return false;
      });
    }
    if (classDateRange && classDateRange[0] && classDateRange[1]) {
      filtered = filtered.filter((cls) => {
        const createdAt = dayjs(cls.createdAt);
        return (
          createdAt.isAfter(classDateRange[0]!.subtract(1, "day")) &&
          createdAt.isBefore(classDateRange[1]!.add(1, "day"))
        );
      });
    }
    return filtered;
  }, [classes, selectedSemester, classDateRange?.[0]?.valueOf(), classDateRange?.[1]?.valueOf()]);
  const semesterColumns = [
    {
      title: "Semester Code",
      dataIndex: "semesterCode",
      key: "semesterCode",
    },
    {
      title: "Academic Year",
      dataIndex: "academicYear",
      key: "academicYear",
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, record: any) => {
        const now = dayjs();
        const startDate = dayjs(record.startDate);
        const endDate = dayjs(record.endDate);
        const isActive = now.isAfter(startDate) && now.isBefore(endDate);
        return (
          <Tag color={isActive ? "green" : "default"}>
            {isActive ? "Active" : "Inactive"}
          </Tag>
        );
      },
    },
  ];
  const classColumns = [
    {
      title: "Class Code",
      dataIndex: "classCode",
      key: "classCode",
    },
    {
      title: "Course Name",
      dataIndex: "courseName",
      key: "courseName",
    },
    {
      title: "Semester",
      dataIndex: "semesterName",
      key: "semesterName",
    },
    {
      title: "Lecturer",
      dataIndex: "lecturerName",
      key: "lecturerName",
    },
    {
      title: "Students",
      dataIndex: "studentCount",
      key: "studentCount",
      render: (count: string) => parseInt(count) || 0,
    },
  ];
  const classesBySemesterData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredClasses.forEach((cls) => {
      const semester = cls.semesterName || "Unknown";
      data[semester] = (data[semester] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [filteredClasses]);
  return (
    <>
      <QueryParamsHandler />
      <div className={styles.container}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push('/admin/dashboard')}
            >
              Back
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              <BookOutlined /> Academic Management
            </Title>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={semestersLoading || classesLoading}
          >
            Refresh
          </Button>
        </div>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Semesters"
                value={semesters.length}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Classes"
                value={classes.length}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Filtered Semesters"
                value={filteredSemesters.length}
                valueStyle={{ color: COLORS.purple }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Filtered Classes"
                value={filteredClasses.length}
                valueStyle={{ color: COLORS.orange }}
              />
            </Card>
          </Col>
        </Row>
        <Card>
          <Title level={5} style={{ marginBottom: 16 }}>Filters</Title>
          <Space size="large" wrap>
            <Space>
              <span style={{ fontWeight: 500 }}>Semester Date Range:</span>
              <RangePicker
                placeholder={["Start Date", "End Date"]}
                value={semesterDateRange}
                onChange={(dates) => setSemesterDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                style={{ width: 250 }}
                allowClear
              />
            </Space>
          </Space>
          <div style={{ marginTop: 16 }} />
          <Space size="large" wrap>
            <Space>
              <span style={{ fontWeight: 500 }}>Semester:</span>
              <Select
                placeholder="All Semesters"
                allowClear
                style={{ width: 200 }}
                value={selectedSemester}
                onChange={setSelectedSemester}
              >
                {semesters.map((sem) => (
                  <Select.Option key={sem.id} value={sem.semesterCode}>
                    {sem.semesterCode}
                  </Select.Option>
                ))}
              </Select>
            </Space>
            <Space>
              <span style={{ fontWeight: 500 }}>Class Date Range:</span>
              <RangePicker
                placeholder={["Start Date", "End Date"]}
                value={classDateRange}
                onChange={(dates) => setClassDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                style={{ width: 250 }}
                allowClear
              />
            </Space>
          </Space>
        </Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Classes by Semester" loading={classesLoading}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={classesBySemesterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.blue} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Semesters" loading={semestersLoading}>
              <Table
                columns={semesterColumns}
                dataSource={filteredSemesters}
                rowKey="id"
                pagination={{ pageSize: 5, showTotal: (total) => `Total ${total} semesters` }}
                scroll={{ x: 600 }}
              />
            </Card>
          </Col>
        </Row>
        <Card
          title={`All Classes (${filteredClasses.length} of ${classes.length})`}
          loading={classesLoading}
        >
          <Table
            columns={classColumns}
            dataSource={filteredClasses}
            rowKey="id"
            pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} classes` }}
            scroll={{ x: 800 }}
          />
        </Card>
      </div>
    </>
  );
};
export default AcademicPage;