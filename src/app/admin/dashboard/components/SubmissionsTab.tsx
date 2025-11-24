"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, Row, Col, Statistic, Table, Tag, Typography, Space, Progress, Input, Select, DatePicker, Button, App } from "antd";
import {
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  SearchOutlined,
  FilterOutlined,
  FileExcelOutlined,
  TrophyOutlined,
  ExperimentOutlined,
  WarningOutlined,
  RiseOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { Dayjs } from "dayjs";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { submissionService } from "@/services/submissionService";
import type { DashboardOverview, ChartData } from "@/services/adminDashboardService";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Search } = Input;
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

interface SubmissionsTabProps {
  overview: DashboardOverview | null;
  chartData: ChartData | null;
  loading: boolean;
  onRefresh: () => void;
}

const SubmissionsTab: React.FC<SubmissionsTabProps> = ({
  overview,
  chartData,
  loading,
}) => {
  const { message } = App.useApp();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportExcel = () => {
    if (!overview) {
      message.warning("No data available to export");
      return;
    }

    try {
      setExportLoading(true);
      const wb = XLSX.utils.book_new();

      // All Statistics Cards Sheet
      const statsData = [
        ["Metric", "Value"],
        ["Total Submissions", overview.submissions.total],
        ["Graded", overview.submissions.graded],
        ["Pending Grading", overview.submissions.pending],
        ["Not Submitted", overview.submissions.notSubmitted],
        ["Completion Rate (%)", overview.submissions.completionRate],
        ["Grading Rate (%)", overview.submissions.total > 0 ? Math.round((overview.submissions.graded / overview.submissions.total) * 100) : 0],
        ["Pending Rate (%)", overview.submissions.total > 0 ? Math.round((overview.submissions.pending / overview.submissions.total) * 100) : 0],
        ["Average Grade", overview.submissions.graded > 0 ? (submissions.filter((s) => s.lastGrade > 0).reduce((sum, s) => sum + s.lastGrade, 0) / overview.submissions.graded).toFixed(2) : 0],
        ["Late Submissions", overview.submissions.lateSubmissions || 0],
        ["On-Time Submissions", overview.submissions.onTimeSubmissions || 0],
        ["Assignments", overview.submissions.submissionsByType?.assignment || 0],
        ["Labs", overview.submissions.submissionsByType?.lab || 0],
        ["Practical Exams", overview.submissions.submissionsByType?.practicalExam || 0],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, ws1, "Statistics");

      // Submission Status Distribution (Pie Chart Data)
      const pieChartData = submissionStatusData.map((item) => ({
        Status: item.name,
        Count: item.value,
        Percentage: overview.submissions.total > 0 ? ((item.value / overview.submissions.total) * 100).toFixed(2) + "%" : "0%",
      }));
      const ws2 = XLSX.utils.json_to_sheet(pieChartData);
      XLSX.utils.book_append_sheet(wb, ws2, "Status Distribution");

      // Submission Status Bar Chart Data
      if (chartData?.submissionStatus && chartData.submissionStatus.length > 0) {
        const barChartData = chartData.submissionStatus.map((item) => ({
          Status: item.status,
          Count: item.count,
        }));
        const ws3 = XLSX.utils.json_to_sheet(barChartData);
        XLSX.utils.book_append_sheet(wb, ws3, "Status Bar Chart");
      }

      // Submissions Over Time (Line Chart Data - Last 30 Days)
      if (submissionsChartData && submissionsChartData.length > 0) {
        const lineChartData = submissionsChartData.map((item: any) => ({
          Date: item.date,
          "Total Submissions": item.count,
          Graded: item.graded,
        }));
        const ws4 = XLSX.utils.json_to_sheet(lineChartData);
        XLSX.utils.book_append_sheet(wb, ws4, "Submissions Over Time");
      }

      // All Submissions Table (Filtered)
      const submissionsData = filteredSubmissions.map((sub, index) => ({
        "No": index + 1,
        "ID": sub.id,
        "Student Name": sub.studentName || "",
        "Student Code": sub.studentCode || "",
        "Submitted At": sub.submittedAt ? dayjs(sub.submittedAt).format("YYYY-MM-DD HH:mm") : "Not submitted",
        "Last Grade": sub.lastGrade || 0,
        "Status": sub.lastGrade > 0 ? "Graded" : sub.submittedAt ? "Pending" : "Not Submitted",
        "Has File": sub.submissionFile ? "Yes" : "No",
      }));
      const ws5 = XLSX.utils.json_to_sheet(submissionsData);
      XLSX.utils.book_append_sheet(wb, ws5, "All Submissions");

      // Top Students Sheet
      if (overview.submissions.topStudentsBySubmissions && overview.submissions.topStudentsBySubmissions.length > 0) {
        const topStudentsData = overview.submissions.topStudentsBySubmissions.map((student, index) => ({
          "Rank": index + 1,
          "Student Code": student.studentCode,
          "Student Name": student.studentName,
          "Submissions": student.submissionCount,
          "Average Grade": student.averageGrade?.toFixed(2) || 0,
        }));
        const ws6 = XLSX.utils.json_to_sheet(topStudentsData);
        XLSX.utils.book_append_sheet(wb, ws6, "Top Students");
      }

      // Submissions by Day Sheet
      if (overview.submissions.submissionsByDay && overview.submissions.submissionsByDay.length > 0) {
        const byDayData = overview.submissions.submissionsByDay.map((item) => ({
          Date: item.date,
          Count: item.count,
        }));
        const ws7 = XLSX.utils.json_to_sheet(byDayData);
        XLSX.utils.book_append_sheet(wb, ws7, "Submissions by Day");
      }

      const fileName = `Submissions_Dashboard_${dayjs().format("YYYY-MM-DD")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success(`Exported all submissions data successfully`);
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export submissions data");
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setSubmissionsLoading(true);
      const submissionsData = await submissionService.getSubmissionList({});
      setSubmissions(submissionsData);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissions];

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.studentName?.toLowerCase().includes(searchLower) ||
          sub.studentCode?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedStatus) {
      if (selectedStatus === "graded") {
        filtered = filtered.filter((sub) => sub.lastGrade > 0);
      } else if (selectedStatus === "pending") {
        filtered = filtered.filter((sub) => sub.lastGrade === 0 && sub.submittedAt);
      } else if (selectedStatus === "not_submitted") {
        filtered = filtered.filter((sub) => !sub.submittedAt);
      }
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter((sub) => {
        if (!sub.submittedAt) return false;
        const submittedDate = dayjs(sub.submittedAt);
        const startDate = dateRange[0]!.startOf("day");
        const endDate = dateRange[1]!.endOf("day");
        return (
          (submittedDate.isAfter(startDate) || submittedDate.isSame(startDate)) &&
          (submittedDate.isBefore(endDate) || submittedDate.isSame(endDate))
        );
      });
    }

    return filtered;
  }, [submissions, searchText, selectedStatus, dateRange]);

  if (!overview) return null;

  const submissionStatusData = [
    { name: "Graded", value: overview.submissions.graded, color: COLORS.green },
    { name: "Pending", value: overview.submissions.pending, color: COLORS.orange },
    { name: "Not Submitted", value: overview.submissions.notSubmitted, color: COLORS.red },
  ];

  const submissionColumns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Student",
      key: "student",
      render: (_: any, record: any) => (
        <Space>
          <UserOutlined />
          <span>{record.studentName} ({record.studentCode})</span>
        </Space>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      render: (date: string) => date ? dayjs(date).format("MMM DD, YYYY HH:mm") : "Not submitted",
    },
    {
      title: "Grade",
      dataIndex: "lastGrade",
      key: "lastGrade",
      render: (grade: number) => (
        <Tag color={grade > 0 ? "green" : "default"}>
          {grade > 0 ? grade.toFixed(2) : "Not graded"}
        </Tag>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, record: any) => {
        if (!record.submittedAt) {
          return <Tag color="red">Not Submitted</Tag>;
        }
        if (record.lastGrade > 0) {
          return <Tag color="green">Graded</Tag>;
        }
        return <Tag color="orange">Pending</Tag>;
      },
    },
    {
      title: "File",
      dataIndex: "submissionFile",
      key: "submissionFile",
      render: (file: any) => (
        file ? (
          <Tag color="blue">Yes</Tag>
        ) : (
          <Tag>No</Tag>
        )
      ),
    },
  ];

  // Group submissions by date for chart
  const submissionsByDate = submissions.reduce((acc: any, sub: any) => {
    if (sub.submittedAt) {
      const date = dayjs(sub.submittedAt).format("YYYY-MM-DD");
      if (!acc[date]) {
        acc[date] = { date, count: 0, graded: 0 };
      }
      acc[date].count++;
      if (sub.lastGrade > 0) {
        acc[date].graded++;
      }
    }
    return acc;
  }, {});

  const submissionsChartData = Object.values(submissionsByDate)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .slice(-30); // Last 30 days

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* Export Button Header */}
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>Submissions Dashboard</Title>
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

      {/* Submission Statistics Overview */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Submission Statistics Overview</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Submissions"
                value={overview.submissions.total}
                prefix={<UploadOutlined />}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Graded"
                value={overview.submissions.graded}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Pending Grading"
                value={overview.submissions.pending}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: COLORS.orange }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completion Rate"
                value={overview.submissions.completionRate}
                suffix="%"
                prefix={<FileTextOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
              <Progress
                percent={overview.submissions.completionRate}
                size="small"
                style={{ marginTop: "8px" }}
              />
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Average Grade"
                value={overview.submissions.averageGrade || 0}
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
                value={overview.submissions.onTimeSubmissions || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Late Submissions"
                value={overview.submissions.lateSubmissions || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: COLORS.red }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Not Submitted"
                value={overview.submissions.notSubmitted || 0}
                valueStyle={{ color: COLORS.red }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Submission by Type */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Submissions by Type</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Assignments"
                value={overview.submissions.submissionsByType?.assignment || 0}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Labs"
                value={overview.submissions.submissionsByType?.lab || 0}
                prefix={<ExperimentOutlined />}
                valueStyle={{ color: COLORS.cyan }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Practical Exams"
                value={overview.submissions.submissionsByType?.practicalExam || 0}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: COLORS.orange }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Grade Distribution */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Grade Distribution</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Excellent (≥8.5)"
                value={overview.submissions.submissionsByGradeRange?.excellent || 0}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Good (7.0-8.4)"
                value={overview.submissions.submissionsByGradeRange?.good || 0}
                prefix={<RiseOutlined />}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Average (5.5-6.9)"
                value={overview.submissions.submissionsByGradeRange?.average || 0}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: COLORS.orange }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Below Average (<5.5)"
                value={overview.submissions.submissionsByGradeRange?.belowAverage || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: COLORS.red }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Submission Status Distribution" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={submissionStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) =>
                    `${entry.name} ${(entry.percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {submissionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Submission Status (Bar Chart)" loading={loading}>
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
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="Submissions Over Time (Last 30 Days)" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={submissionsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={COLORS.blue}
                  name="Total Submissions"
                />
                <Line
                  type="monotone"
                  dataKey="graded"
                  stroke={COLORS.green}
                  name="Graded"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Submissions Table */}
      <Card
        title="All Submissions"
        loading={submissionsLoading}
        extra={
          <Space>
            <Select
              placeholder="Filter by Status"
              allowClear
              style={{ width: 150 }}
              value={selectedStatus}
              onChange={setSelectedStatus}
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value="graded">Graded</Select.Option>
              <Select.Option value="pending">Pending</Select.Option>
              <Select.Option value="not_submitted">Not Submitted</Select.Option>
            </Select>
            <RangePicker
              placeholder={["Start Date", "End Date"]}
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
              style={{ width: 250 }}
              allowClear
            />
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Search
            placeholder="Search by student name or code"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={setSearchText}
          />
          <Text type="secondary">
            Showing {filteredSubmissions.length} of {submissions.length} submissions
          </Text>
        </Space>
        <Table
          columns={submissionColumns}
          dataSource={filteredSubmissions}
          rowKey="id"
          pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} submissions` }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </Space>
  );
};

export default SubmissionsTab;

