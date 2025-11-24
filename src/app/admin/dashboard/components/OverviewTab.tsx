"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, Row, Col, Statistic, Typography, Space, DatePicker, Select, Button, App } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  BarChartOutlined,
  CalendarOutlined,
  FileExcelOutlined,
  UsergroupAddOutlined,
  SolutionOutlined,
  ExperimentOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DashboardOverview, ChartData } from "@/services/adminDashboardService";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const COLORS = {
  blue: "#2563EB",
  green: "#10B981",
  purple: "#6D28D9",
  orange: "#F59E0B",
  red: "#EF4444",
  cyan: "#06B6D4",
};

const CHART_COLORS = ["#2563EB", "#10B981", "#6D28D9", "#F59E0B", "#EF4444"];

interface OverviewTabProps {
  overview: DashboardOverview | null;
  chartData: ChartData | null;
  loading: boolean;
  onRefresh: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  overview,
  chartData,
  loading,
  onRefresh,
}) => {
  const { message } = App.useApp();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [timeRange, setTimeRange] = useState<string>("all");
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportExcel = () => {
    if (!overview || !chartData) {
      message.warning("No data available to export");
      return;
    }

    try {
      setExportLoading(true);
      const wb = XLSX.utils.book_new();
      const dataToExport = filteredChartData || chartData;

      // All Statistics Cards Sheet (8 cards total)
      const statsData = [
        ["Metric", "Value"],
        ["Total Users", overview.users.total],
        ["Total Classes", overview.academic.totalClasses],
        ["Total Submissions", overview.submissions.total],
        ["Completion Rate (%)", overview.submissions.completionRate],
        ["Active Semesters", overview.academic.activeSemesters],
        ["Assessment Templates", overview.assessments.totalTemplates],
        ["Grading Groups", overview.grading.totalGradingGroups],
        ["Pending Requests", overview.grading.pendingAssignRequests],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, ws1, "Statistics");

      // User Growth Chart Data (Line Chart)
      if (dataToExport.userGrowth && dataToExport.userGrowth.length > 0) {
        const userGrowthData = dataToExport.userGrowth.map((item) => ({
          Month: item.month,
          "Total Users": item.total,
          Students: item.students,
          Lecturers: item.lecturers,
        }));
        const ws2 = XLSX.utils.json_to_sheet(userGrowthData);
        XLSX.utils.book_append_sheet(wb, ws2, "User Growth");
      }

      // Semester Activity Chart Data
      if (dataToExport.semesterActivity && dataToExport.semesterActivity.length > 0) {
        const semesterData = dataToExport.semesterActivity.map((item) => ({
          Semester: item.semester,
          Courses: item.courses,
          Classes: item.classes,
          Assessments: item.assessments,
          Submissions: item.submissions,
        }));
        const ws3 = XLSX.utils.json_to_sheet(semesterData);
        XLSX.utils.book_append_sheet(wb, ws3, "Semester Activity");
      }

      // Assessment Distribution Chart Data (Pie Chart)
      if (dataToExport.assessmentDistribution && dataToExport.assessmentDistribution.length > 0) {
        const totalAssessments = dataToExport.assessmentDistribution.reduce((sum, item) => sum + item.count, 0);
        const assessmentData = dataToExport.assessmentDistribution.map((item) => ({
          Type: item.type,
          Count: item.count,
          Percentage: totalAssessments > 0 ? ((item.count / totalAssessments) * 100).toFixed(2) + "%" : "0%",
        }));
        const ws4 = XLSX.utils.json_to_sheet(assessmentData);
        XLSX.utils.book_append_sheet(wb, ws4, "Assessment Distribution");
      }

      // Submission Status Chart Data (Bar Chart)
      if (dataToExport.submissionStatus && dataToExport.submissionStatus.length > 0) {
        const submissionData = dataToExport.submissionStatus.map((item) => ({
          Status: item.status,
          Count: item.count,
        }));
        const ws5 = XLSX.utils.json_to_sheet(submissionData);
        XLSX.utils.book_append_sheet(wb, ws5, "Submission Status");
      }

      // Grading Performance Chart Data (Line Chart)
      if (dataToExport.gradingPerformance && dataToExport.gradingPerformance.length > 0) {
        const gradingData = dataToExport.gradingPerformance.map((item) => ({
          Date: item.date,
          Graded: item.graded,
          Pending: item.pending,
        }));
        const ws6 = XLSX.utils.json_to_sheet(gradingData);
        XLSX.utils.book_append_sheet(wb, ws6, "Grading Performance");
      }

      const fileName = `Dashboard_Overview_${dayjs().format("YYYY-MM-DD")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success("All dashboard data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export dashboard data");
    } finally {
      setExportLoading(false);
    }
  };

  // Calculate date range based on timeRange selection
  useEffect(() => {
    if (timeRange === "today") {
      setDateRange([dayjs().startOf("day"), dayjs().endOf("day")]);
    } else if (timeRange === "week") {
      setDateRange([dayjs().startOf("week"), dayjs().endOf("week")]);
    } else if (timeRange === "month") {
      setDateRange([dayjs().startOf("month"), dayjs().endOf("month")]);
    } else if (timeRange === "semester") {
      // Get current semester date range from overview if available
      // For now, use last 4 months as semester approximation
      setDateRange([dayjs().subtract(4, "month"), dayjs()]);
    } else if (timeRange === "all") {
      setDateRange(null);
    }
    // If custom, keep the dateRange as is
  }, [timeRange]);

  // Filter chart data based on date range
  const filteredChartData = useMemo(() => {
    if (!chartData) return null;

    const filtered: ChartData = {
      userGrowth: chartData.userGrowth || [],
      semesterActivity: chartData.semesterActivity || [],
      assessmentDistribution: chartData.assessmentDistribution || [],
      submissionStatus: chartData.submissionStatus || [],
      gradingPerformance: chartData.gradingPerformance || [],
    };

    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0];
      const endDate = dateRange[1];

      // Filter user growth data
      if (filtered.userGrowth) {
        filtered.userGrowth = filtered.userGrowth.filter((item) => {
          const itemDate = dayjs(item.month + "-01");
          return itemDate.isAfter(startDate.subtract(1, "day")) && itemDate.isBefore(endDate.add(1, "day"));
        });
      }

      // Filter grading performance data
      if (filtered.gradingPerformance) {
        filtered.gradingPerformance = filtered.gradingPerformance.filter((item) => {
          const itemDate = dayjs(item.date);
          return itemDate.isAfter(startDate.subtract(1, "day")) && itemDate.isBefore(endDate.add(1, "day"));
        });
      }
    }

    return filtered;
  }, [chartData, dateRange]);

  if (!overview) return null;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* Export Button Header */}
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>Dashboard Overview</Title>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            loading={exportLoading}
            type="primary"
            size="large"
          >
            Export All Data to Excel
          </Button>
        </Space>
      </Card>

      {/* Filters */}
      <Card>
        <Space size="large" wrap>
          <Space>
            <CalendarOutlined />
            <span style={{ fontWeight: 500 }}>Time Range:</span>
            <Select
              value={timeRange}
              onChange={(value) => {
                setTimeRange(value);
                if (value !== "custom") {
                  setDateRange(null);
                }
              }}
              style={{ width: 150 }}
            >
              <Select.Option value="all">All Time</Select.Option>
              <Select.Option value="today">Today</Select.Option>
              <Select.Option value="week">This Week</Select.Option>
              <Select.Option value="month">This Month</Select.Option>
              <Select.Option value="semester">This Semester</Select.Option>
              <Select.Option value="custom">Custom Range</Select.Option>
            </Select>
          </Space>
          {(timeRange === "custom" || dateRange) && (
            <RangePicker
              placeholder={["Start Date", "End Date"]}
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates as [Dayjs | null, Dayjs | null] | null);
                if (dates) {
                  setTimeRange("custom");
                }
              }}
              style={{ width: 300 }}
              allowClear
            />
          )}
          {dateRange && (
            <Button
              onClick={() => {
                setDateRange(null);
                setTimeRange("all");
              }}
            >
              Clear Filter
            </Button>
          )}
        </Space>
      </Card>
      {/* Key Metrics - User Management */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>User Management</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Users"
                value={overview.users.total}
                prefix={<UserOutlined />}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Users"
                value={overview.users.active}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="New This Month"
                value={overview.users.newThisMonth}
                prefix={<RiseOutlined />}
                valueStyle={{ color: COLORS.cyan }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Inactive Users"
                value={overview.users.inactive || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: COLORS.orange }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Academic Management */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Academic Management</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Classes"
                value={overview.academic.totalClasses}
                prefix={<BookOutlined />}
                valueStyle={{ color: COLORS.cyan }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Courses"
                value={overview.academic.totalCourses || 0}
                prefix={<GlobalOutlined />}
                valueStyle={{ color: COLORS.purple }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Students"
                value={overview.academic.totalStudents || 0}
                prefix={<UsergroupAddOutlined />}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Lecturers"
                value={overview.academic.totalLecturers || 0}
                prefix={<SolutionOutlined />}
                valueStyle={{ color: COLORS.orange }}
              />
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Semesters"
                value={overview.academic.activeSemesters}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Classes Overloaded"
                value={overview.academic.classesOverloaded || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: COLORS.red }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Avg Students/Class"
                value={overview.academic.averageStudentsPerClass}
                precision={1}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: COLORS.cyan }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Student/Lecturer Ratio"
                value={overview.academic.studentToLecturerRatio || 0}
                precision={1}
                prefix={<TeamOutlined />}
                valueStyle={{ color: COLORS.purple }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Assessment & Submission */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Assessment & Submission</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Submissions"
                value={overview.submissions.total}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completion Rate"
                value={overview.submissions.completionRate}
                suffix="%"
                prefix={<TrophyOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Average Grade"
                value={overview.submissions.averageGrade}
                precision={2}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: COLORS.purple }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="On-Time Submissions"
                value={overview.submissions.onTimeSubmissions}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Late Submissions"
                value={overview.submissions.lateSubmissions}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: COLORS.red }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Assessment Templates"
                value={overview.assessments.totalTemplates}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: COLORS.orange }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Assessments"
                value={overview.assessments.assessmentsByStatus?.active || 0}
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: COLORS.cyan }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completed Assessments"
                value={overview.assessments.assessmentsByStatus?.completed || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Grading & Quality */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Grading & Quality</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Grading Groups"
                value={overview.grading.totalGradingGroups}
                prefix={<TeamOutlined />}
                valueStyle={{ color: COLORS.cyan }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completed Sessions"
                value={overview.grading.completedGradingSessions}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Pending Requests"
                value={overview.grading.pendingAssignRequests}
                prefix={<WarningOutlined />}
                valueStyle={{ color: COLORS.red }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Sessions"
                value={overview.grading.totalGradingSessions}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={`User Growth${dateRange ? ` (${dateRange[0]?.format("MMM DD")} - ${dateRange[1]?.format("MMM DD, YYYY")})` : " (Last 12 Months)"}`}
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredChartData?.userGrowth || chartData?.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={COLORS.blue}
                  name="Total Users"
                />
                <Line
                  type="monotone"
                  dataKey="students"
                  stroke={COLORS.green}
                  name="Students"
                />
                <Line
                  type="monotone"
                  dataKey="lecturers"
                  stroke={COLORS.purple}
                  name="Lecturers"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Assessment Distribution" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={(chartData?.assessmentDistribution || []) as any}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) =>
                    `${entry.name} ${(entry.percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(chartData?.assessmentDistribution || []).map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Submission Status" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData?.submissionStatus || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill={COLORS.blue} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title={`Grading Performance${dateRange ? ` (${dateRange[0]?.format("MMM DD")} - ${dateRange[1]?.format("MMM DD, YYYY")})` : " (Last 30 Days)"}`}
            loading={loading}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredChartData?.gradingPerformance || chartData?.gradingPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="graded"
                  stroke={COLORS.green}
                  name="Graded"
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  stroke={COLORS.orange}
                  name="Pending"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

    </Space>
  );
};

export default OverviewTab;

