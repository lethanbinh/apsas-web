"use client";

import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import type {
  ChartData,
  DashboardOverview,
} from "@/services/adminDashboardService";
import { adminDashboardService } from "@/services/adminDashboardService";
import {
  BookOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  FileTextOutlined,
  ReloadOutlined,
  UploadOutlined,
  UserOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Alert, Button, Space, Spin, Tabs, Select, Card } from "antd";
import { useEffect, useState } from "react";
import AcademicTab from "./components/AcademicTab";
import AssessmentsTab from "./components/AssessmentsTab";
import GradingTab from "./components/GradingTab";
import OverviewTab from "./components/OverviewTab";
import SubmissionsTab from "./components/SubmissionsTab";
import UsersTab from "./components/UsersTab";
import AcademicPerformanceTab from "./components/AcademicPerformanceTab";
import styles from "./DashboardAdmin.module.css";
import { classService } from "@/services/classService";
import { semesterService } from "@/services/semesterService";
import { courseElementService } from "@/services/courseElementService";

const AdminDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Filters
  const [selectedClassId, setSelectedClassId] = useState<number | undefined>(undefined);
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(undefined);
  const [selectedSemesterCode, setSelectedSemesterCode] = useState<string | undefined>(undefined);
  
  // Filter options
  const [classes, setClasses] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchFilterOptions = async () => {
    try {
      setFiltersLoading(true);
      const [classesRes, semestersRes, courseElementsRes] = await Promise.all([
        classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
        semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
        courseElementService.getCourseElements({ pageNumber: 1, pageSize: 1000 }),
      ]);

      setClasses(classesRes.classes || []);
      setSemesters(semestersRes || []);

      // Extract unique courses from course elements
      const uniqueCourses = new Map<number, any>();
      courseElementsRes.forEach((ce) => {
        if (ce.semesterCourse?.course) {
          const course = ce.semesterCourse.course;
          if (!uniqueCourses.has(course.id)) {
            uniqueCourses.set(course.id, course);
          }
        }
      });
      setCourses(Array.from(uniqueCourses.values()));
    } catch (err) {
      console.error("Error fetching filter options:", err);
    } finally {
      setFiltersLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewData, chartDataResult] = await Promise.all([
        adminDashboardService.getDashboardOverview(),
        adminDashboardService.getChartData(),
      ]);

      setOverview(overviewData);
      setChartData(chartDataResult);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Filter object to pass to tabs
  const filterProps = {
    classId: selectedClassId,
    courseId: selectedCourseId,
    semesterCode: selectedSemesterCode,
  };

  const handleRefresh = () => {
    fetchDashboardData();
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
          overview={overview}
          chartData={chartData}
          loading={loading}
          onRefresh={handleRefresh}
          filters={filterProps}
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
          overview={overview}
          chartData={chartData}
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
          overview={overview}
          chartData={chartData}
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
          overview={overview}
          chartData={chartData}
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
          overview={overview}
          chartData={chartData}
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
          overview={overview}
          chartData={chartData}
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

        {/* Filters */}
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
