"use client";

import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { queryKeys } from "@/lib/react-query";
import { adminDashboardService } from "@/services/adminDashboardService";
import { classService } from "@/services/classService";
import { courseElementService } from "@/services/courseElementService";
import { semesterService } from "@/services/semesterService";
import {
  BookOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  FileTextOutlined,
  ReloadOutlined,
  TrophyOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, DatePicker, Select, Space, Spin, Tabs } from "antd";
import { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import AcademicPerformanceTab from "./components/AcademicPerformanceTab";
import AcademicTab from "./components/AcademicTab";
import AssessmentsTab from "./components/AssessmentsTab";
import GradingTab from "./components/GradingTab";
import OverviewTab from "./components/OverviewTab";
import SubmissionsTab from "./components/SubmissionsTab";
import UsersTab from "./components/UsersTab";
import styles from "./DashboardAdmin.module.css";

const AdminDashboardPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");


  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(undefined);
  const [selectedSemesterCode, setSelectedSemesterCode] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { RangePicker } = DatePicker;


  const { data: classesRes } = useQuery({
    queryKey: queryKeys.classes.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
  });

  const { data: semestersRes = [] } = useQuery({
    queryKey: queryKeys.semesters.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
  });

  const { data: courseElementsRes = [] } = useQuery({
    queryKey: queryKeys.courseElements.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => courseElementService.getCourseElements({ pageNumber: 1, pageSize: 1000 }),
  });


  const classes = classesRes?.classes || [];
  const semesters = semestersRes || [];
  const courses = useMemo(() => {
    const uniqueCourses = new Map<number, any>();
    courseElementsRes.forEach((ce) => {
      if (ce.semesterCourse?.course) {
        const course = ce.semesterCourse.course;
        if (!uniqueCourses.has(course.id)) {
          uniqueCourses.set(course.id, course);
        }
      }
    });
    return Array.from(uniqueCourses.values());
  }, [courseElementsRes]);

  const filtersLoading = false;


  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['adminDashboard', 'overview', selectedClassId, selectedCourseId, selectedSemesterCode, dateRange],
    queryFn: () => adminDashboardService.getDashboardOverview(),
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['adminDashboard', 'chartData', selectedClassId, selectedCourseId, selectedSemesterCode, dateRange],
    queryFn: () => adminDashboardService.getChartData(),
    refetchInterval: 5 * 60 * 1000,
  });

  const loading = overviewLoading || chartLoading;
  const error = null;


  const filterProps = {
    classId: selectedClassId,
    courseId: selectedCourseId,
    semesterCode: selectedSemesterCode,
    dateRange: dateRange,
  };

  const handleRefresh = () => {

    queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
  };

  const tabItems = [
    {
      key: "overview",
      label: (
        <Space size={8}>
          <DashboardOutlined />
          <span>Overview</span>
        </Space>
      ),
      children: (
        <OverviewTab
          overview={overview ?? null}
          chartData={chartData ?? null}
          loading={loading}
          onRefresh={handleRefresh}
          filters={filterProps}
          onDateRangeChange={setDateRange}
        />
      ),
    },
    {
      key: "users",
      label: (
        <Space size={8}>
          <UserOutlined />
          <span>Users</span>
        </Space>
      ),
      children: (
        <UsersTab
          overview={overview ?? null}
          chartData={chartData ?? null}
          loading={loading}
          onRefresh={handleRefresh}
          filters={filterProps}
        />
      ),
    },
    {
      key: "academic",
      label: (
        <Space size={8}>
          <BookOutlined />
          <span>Academic</span>
        </Space>
      ),
      children: (
        <AcademicTab
          overview={overview ?? null}
          chartData={chartData ?? null}
          loading={loading}
          onRefresh={handleRefresh}
          filters={filterProps}
        />
      ),
    },
    {
      key: "academic-performance",
      label: (
        <Space size={8}>
          <TrophyOutlined />
          <span>Academic Performance</span>
        </Space>
      ),
      children: (
        <AcademicPerformanceTab
          loading={loading}
          onRefresh={handleRefresh}
          filters={{
            classId: selectedClassId,
            courseId: selectedCourseId,
            semesterCode: selectedSemesterCode,
          }}
        />
      ),
    },
    {
      key: "assessments",
      label: (
        <Space size={8}>
          <FileTextOutlined />
          <span>Assessments</span>
        </Space>
      ),
      children: (
        <AssessmentsTab
          overview={overview ?? null}
          chartData={chartData ?? null}
          loading={loading}
          onRefresh={handleRefresh}
          filters={filterProps}
        />
      ),
    },
    {
      key: "submissions",
      label: (
        <Space size={8}>
          <UploadOutlined />
          <span>Submissions</span>
        </Space>
      ),
      children: (
        <SubmissionsTab
          overview={overview ?? null}
          chartData={chartData ?? null}
          loading={loading}
          onRefresh={handleRefresh}
          filters={filterProps}
        />
      ),
    },
    {
      key: "grading",
      label: (
        <Space size={8}>
          <CheckCircleOutlined />
          <span>Grading</span>
        </Space>
      ),
      children: (
        <GradingTab
          overview={overview ?? null}
          chartData={chartData ?? null}
          loading={loading}
          onRefresh={handleRefresh}
          filters={filterProps}
        />
      ),
    },
  ];

  if (loading && !overview) {
    return (
      <>
        <QueryParamsHandler />
        <div className={styles.container}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "60vh",
            }}
          >
            <Spin size="large" tip="Loading dashboard data..." />
          </div>
        </div>
      </>
    );
  }

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
          <h1 className={styles.title}>Admin Dashboard</h1>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {}
        <Card style={{ marginBottom: "1.5rem" }}>
          <Space size="large" wrap>
            <div>
              <span style={{ marginRight: 8 }}>Class:</span>
              <Select
                style={{ width: 200 }}
                placeholder="All Classes"
                allowClear
                value={selectedClassId}
                onChange={setSelectedClassId}
                loading={filtersLoading}
                options={classes.map((c) => ({
                  label: c.classCode,
                  value: c.id,
                }))}
              />
            </div>
            <div>
              <span style={{ marginRight: 8 }}>Course:</span>
              <Select
                style={{ width: 200 }}
                placeholder="All Courses"
                allowClear
                value={selectedCourseId}
                onChange={setSelectedCourseId}
                loading={filtersLoading}
                options={courses.map((c) => ({
                  label: c.name,
                  value: c.id,
                }))}
              />
            </div>
            <div>
              <span style={{ marginRight: 8 }}>Semester:</span>
              <Select
                style={{ width: 200 }}
                placeholder="All Semesters"
                allowClear
                value={selectedSemesterCode}
                onChange={setSelectedSemesterCode}
                loading={filtersLoading}
                options={semesters.map((s) => ({
                  label: s.semesterCode,
                  value: s.semesterCode,
                }))}
              />
            </div>
            <div>
              <span style={{ marginRight: 8 }}>Date Range:</span>
              <RangePicker
                style={{ width: 250 }}
                placeholder={["Start Date", "End Date"]}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                allowClear
              />
            </div>
          </Space>
        </Card>

        {error && (
          <Alert
            message="Warning"
            description={error}
            type="warning"
            showIcon
            closable
            style={{ marginBottom: "1.5rem" }}
          />
        )}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          type="line"
        />
      </div>
    </>
  );
};

export default AdminDashboardPage;
