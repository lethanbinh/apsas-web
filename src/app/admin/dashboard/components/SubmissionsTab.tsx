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
  filters?: {
    classId?: number;
    courseId?: number;
    semesterCode?: string;
  };
}

const SubmissionsTab: React.FC<SubmissionsTabProps> = ({
  overview,
  chartData,
  loading,
  filters,
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
      const exportData: any[] = [];
      const totalSubmissions = overview.submissions.total;
      const gradedSubmissions = submissions.filter((s) => s.lastGrade > 0);
      const averageGrade = gradedSubmissions.length > 0
        ? (gradedSubmissions.reduce((sum, s) => sum + s.lastGrade, 0) / gradedSubmissions.length).toFixed(2)
        : 0;


      exportData.push(["SUBMISSIONS - KEY STATISTICS"]);
      exportData.push(["Metric", "Value"]);
      exportData.push(["Total Submissions", totalSubmissions]);
      exportData.push(["Graded", overview.submissions.graded]);
      exportData.push(["Pending Grading", overview.submissions.pending]);
      exportData.push(["Not Submitted", overview.submissions.notSubmitted]);
      exportData.push(["Completion Rate (%)", overview.submissions.completionRate]);
      exportData.push(["Grading Rate (%)", totalSubmissions > 0 ? Math.round((overview.submissions.graded / totalSubmissions) * 100) : 0]);
      exportData.push(["Average Grade", averageGrade]);
      exportData.push(["Late Submissions", overview.submissions.lateSubmissions || 0]);
      exportData.push(["On-Time Submissions", overview.submissions.onTimeSubmissions || 0]);
      exportData.push([]);


      exportData.push(["SUBMISSIONS BY TYPE"]);
      exportData.push(["Type", "Count"]);
      exportData.push(["Assignments", overview.submissions.submissionsByType?.assignment || 0]);
      exportData.push(["Labs", overview.submissions.submissionsByType?.lab || 0]);
      exportData.push(["Practical Exams", overview.submissions.submissionsByType?.practicalExam || 0]);
      exportData.push([]);


      exportData.push(["SUBMISSION STATUS DISTRIBUTION"]);
      exportData.push(["Status", "Count", "Percentage"]);
      submissionStatusData.forEach((item) => {
        const percentage = totalSubmissions > 0 ? ((item.value / totalSubmissions) * 100).toFixed(2) + "%" : "0%";
        exportData.push([item.name, item.value, percentage]);
      });
      exportData.push([]);


      if (overview.submissions.submissionsByGradeRange) {
        exportData.push(["GRADE DISTRIBUTION"]);
        exportData.push(["Grade Range", "Count"]);
        exportData.push(["Excellent (>= 8.5)", overview.submissions.submissionsByGradeRange.excellent || 0]);
        exportData.push(["Good (7.0 - 8.4)", overview.submissions.submissionsByGradeRange.good || 0]);
        exportData.push(["Average (5.5 - 6.9)", overview.submissions.submissionsByGradeRange.average || 0]);
        exportData.push(["Below Average (< 5.5)", overview.submissions.submissionsByGradeRange.belowAverage || 0]);
        exportData.push([]);
      }


      if (submissionsChartData && submissionsChartData.length > 0) {
        exportData.push(["SUBMISSIONS OVER TIME (LAST 30 DAYS)"]);
        exportData.push(["Date", "Total Submissions", "Graded"]);
        submissionsChartData.forEach((item: any) => {
          exportData.push([item.date, item.count, item.graded]);
        });
        exportData.push([]);
      }


      if (overview.submissions.topStudentsBySubmissions && overview.submissions.topStudentsBySubmissions.length > 0) {
        exportData.push(["TOP STUDENTS BY SUBMISSIONS"]);
        exportData.push(["Rank", "Student Code", "Student Name", "Submission Count", "Average Grade"]);
        overview.submissions.topStudentsBySubmissions.forEach((item, index) => {
          exportData.push([
            index + 1,
            item.studentCode,
            item.studentName,
            item.submissionCount,
            item.averageGrade.toFixed(2),
          ]);
        });
        exportData.push([]);
      }


      exportData.push(["ALL SUBMISSIONS"]);
      exportData.push(["No", "ID", "Student Name", "Student Code", "Submitted At", "Last Grade", "Status", "Has File"]);
      filteredSubmissions.forEach((sub, index) => {
        exportData.push([
          index + 1,
          sub.id,
          sub.studentName || "",
          sub.studentCode || "",
          sub.submittedAt ? dayjs(sub.submittedAt).format("YYYY-MM-DD HH:mm") : "Not submitted",
          sub.lastGrade || 0,
          sub.lastGrade > 0 ? "Graded" : sub.submittedAt ? "Pending" : "Not Submitted",
          sub.submissionFile ? "Yes" : "No",
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Submissions");

      const fileName = `Submissions_Dashboard_${dayjs().format("YYYY-MM-DD")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success("Submissions data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export submissions data");
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();

  }, [filters?.classId, filters?.courseId, filters?.semesterCode]);

  const fetchSubmissions = async () => {
    try {
      setSubmissionsLoading(true);
      const submissionsData = await submissionService.getSubmissionList({
        classId: filters?.classId,
      });
      setSubmissions(submissionsData);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setSubmissionsLoading(false);
    }
  };


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
    .slice(-30);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {}
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

      {}
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

      {}
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

      {}
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

      {}
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

      {}
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

