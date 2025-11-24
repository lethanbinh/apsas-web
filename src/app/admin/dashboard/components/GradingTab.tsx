"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, Row, Col, Statistic, Table, Tag, Typography, Space, Progress, Input, Select, DatePicker, Button, App } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  UserOutlined,
  FileTextOutlined,
  TeamOutlined,
  SearchOutlined,
  FilterOutlined,
  FileExcelOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  SolutionOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Dayjs } from "dayjs";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { gradingGroupService } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import { adminService } from "@/services/adminService";
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

interface GradingTabProps {
  overview: DashboardOverview | null;
  chartData: ChartData | null;
  loading: boolean;
  onRefresh: () => void;
}

const GradingTab: React.FC<GradingTabProps> = ({
  overview,
  chartData,
  loading,
}) => {
  const { message } = App.useApp();
  const [gradingGroups, setGradingGroups] = useState<any[]>([]);
  const [gradingSessions, setGradingSessions] = useState<any[]>([]);
  const [assignRequests, setAssignRequests] = useState<any[]>([]);
  const [gradingGroupsLoading, setGradingGroupsLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportExcel = () => {
    if (!overview) {
      message.warning("No data available to export");
      return;
    }

    try {
      setExportLoading(true);
      const wb = XLSX.utils.book_new();

      // All Statistics Cards Sheet (6 cards)
      const statsData = [
        ["Metric", "Value"],
        ["Total Grading Groups", overview.grading.totalGradingGroups],
        ["Total Grading Sessions", overview.grading.totalGradingSessions],
        ["Completed Sessions", overview.grading.completedGradingSessions || 0],
        ["Processing Sessions", processingSessions.length],
        ["Failed Sessions", failedSessions.length],
        ["Pending Assign Requests", overview.grading.pendingAssignRequests],
        ["Average Grading Time", overview.grading.averageGradingTime?.toFixed(2) || "N/A"],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, ws1, "Statistics");

      // Grading Session Status Distribution Chart Data (Pie Chart)
      const totalSessions = gradingSessions.length;
      const sessionStatusData = [
        { Status: "Completed", Count: completedSessions.length, Percentage: totalSessions > 0 ? ((completedSessions.length / totalSessions) * 100).toFixed(2) + "%" : "0%" },
        { Status: "Processing", Count: processingSessions.length, Percentage: totalSessions > 0 ? ((processingSessions.length / totalSessions) * 100).toFixed(2) + "%" : "0%" },
        { Status: "Failed", Count: failedSessions.length, Percentage: totalSessions > 0 ? ((failedSessions.length / totalSessions) * 100).toFixed(2) + "%" : "0%" },
      ];
      const ws2 = XLSX.utils.json_to_sheet(sessionStatusData);
      XLSX.utils.book_append_sheet(wb, ws2, "Session Status Distribution");

      // Grading Session Type Distribution Chart Data (Pie Chart)
      const aiSessions = gradingSessions.filter((s) => s.gradingType === 0).length;
      const lecturerSessions = gradingSessions.filter((s) => s.gradingType === 1).length;
      const bothSessions = gradingSessions.filter((s) => s.gradingType === 2).length;
      const sessionTypeData = [
        { Type: "AI", Count: aiSessions, Percentage: totalSessions > 0 ? ((aiSessions / totalSessions) * 100).toFixed(2) + "%" : "0%" },
        { Type: "Lecturer", Count: lecturerSessions, Percentage: totalSessions > 0 ? ((lecturerSessions / totalSessions) * 100).toFixed(2) + "%" : "0%" },
        { Type: "Both", Count: bothSessions, Percentage: totalSessions > 0 ? ((bothSessions / totalSessions) * 100).toFixed(2) + "%" : "0%" },
      ];
      const ws3 = XLSX.utils.json_to_sheet(sessionTypeData);
      XLSX.utils.book_append_sheet(wb, ws3, "Session Type Distribution");

      // Grading Performance Chart Data (Line Chart - Last 30 Days)
      if (chartData?.gradingPerformance && chartData.gradingPerformance.length > 0) {
        const gradingPerformanceData = chartData.gradingPerformance.map((item) => ({
          Date: item.date,
          Graded: item.graded,
          Pending: item.pending,
        }));
        const ws4 = XLSX.utils.json_to_sheet(gradingPerformanceData);
        XLSX.utils.book_append_sheet(wb, ws4, "Grading Performance");
      }

      // Grading by Lecturer Chart Data (Bar Chart)
      if (overview.grading.gradingByLecturer && overview.grading.gradingByLecturer.length > 0) {
        const gradingByLecturerData = overview.grading.gradingByLecturer.map((item) => ({
          Lecturer: item.lecturerName,
          "Session Count": item.sessionCount,
          "Completed Count": item.completedCount,
        }));
        const ws8 = XLSX.utils.json_to_sheet(gradingByLecturerData);
        XLSX.utils.book_append_sheet(wb, ws8, "Grading by Lecturer");
      }

      // All Grading Groups Table (Filtered)
      const groupsData = filteredGradingGroups.map((group, index) => ({
        "No": index + 1,
        "ID": group.id,
        "Lecturer": group.lecturerName || "",
        "Lecturer Code": group.lecturerCode || "",
        "Assessment Template": group.assessmentTemplateName || "",
        "Submissions": group.submissionCount || 0,
        "Created At": group.createdAt ? dayjs(group.createdAt).format("YYYY-MM-DD") : "",
      }));
      const ws5 = XLSX.utils.json_to_sheet(groupsData);
      XLSX.utils.book_append_sheet(wb, ws5, "All Grading Groups");

      // All Grading Sessions Table (Filtered)
      const sessionsData = filteredGradingSessions.map((session, index) => ({
        "No": index + 1,
        "ID": session.id,
        "Student Name": session.submissionStudentName || "",
        "Student Code": session.submissionStudentCode || "",
        "Status": session.status === 0 ? "Processing" : session.status === 1 ? "Completed" : "Failed",
        "Type": session.gradingType === 0 ? "AI" : session.gradingType === 1 ? "Lecturer" : "Both",
        "Grade": session.grade || 0,
        "Created At": session.createdAt ? dayjs(session.createdAt).format("YYYY-MM-DD HH:mm") : "",
      }));
      const ws6 = XLSX.utils.json_to_sheet(sessionsData);
      XLSX.utils.book_append_sheet(wb, ws6, "All Grading Sessions");

      // All Assign Requests Table (Filtered)
      const requestsData = filteredAssignRequests.map((request, index) => ({
        "No": index + 1,
        "ID": request.id,
        "Course Element": request.courseElementName || "",
        "Course": request.courseName || "",
        "Assigned Lecturer": request.assignedLecturerName || "",
        "Assigned By HOD": request.assignedByHODName || "",
        "Status": request.status === 0 ? "Pending" : request.status === 1 ? "Approved" : "Rejected",
        "Created At": request.createdAt ? dayjs(request.createdAt).format("YYYY-MM-DD") : "",
      }));
      const ws7 = XLSX.utils.json_to_sheet(requestsData);
      XLSX.utils.book_append_sheet(wb, ws7, "All Assign Requests");

      const fileName = `Grading_Dashboard_${dayjs().format("YYYY-MM-DD")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success("All grading data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export grading data");
    } finally {
      setExportLoading(false);
    }
  };
  
  // Filters for grading groups
  const [groupSearch, setGroupSearch] = useState("");
  const [groupDateRange, setGroupDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  
  // Filters for grading sessions
  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedSessionStatus, setSelectedSessionStatus] = useState<number | undefined>(undefined);
  const [selectedSessionType, setSelectedSessionType] = useState<number | undefined>(undefined);
  const [sessionDateRange, setSessionDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  
  // Filters for assign requests
  const [requestSearch, setRequestSearch] = useState("");
  const [selectedRequestStatus, setSelectedRequestStatus] = useState<number | undefined>(undefined);
  const [requestDateRange, setRequestDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setGradingGroupsLoading(true);
      setSessionsLoading(true);
      setRequestsLoading(true);
      
      const [groupsData, sessionsData, requestsData] = await Promise.all([
        gradingGroupService.getGradingGroups({}),
        gradingService.getGradingSessions({ pageNumber: 1, pageSize: 1000 }),
        adminService.getApprovalList(1, 1000),
      ]);
      
      setGradingGroups(groupsData);
      setGradingSessions(sessionsData.items);
      setAssignRequests(requestsData.items);
    } catch (error) {
      console.error("Error fetching grading data:", error);
    } finally {
      setGradingGroupsLoading(false);
      setSessionsLoading(false);
      setRequestsLoading(false);
    }
  };

  // Filter grading groups
  const filteredGradingGroups = useMemo(() => {
    let filtered = [...gradingGroups];

    if (groupSearch) {
      const searchLower = groupSearch.toLowerCase();
      filtered = filtered.filter(
        (group) =>
          group.lecturerName?.toLowerCase().includes(searchLower) ||
          group.lecturerCode?.toLowerCase().includes(searchLower) ||
          group.assessmentTemplateName?.toLowerCase().includes(searchLower)
      );
    }

    if (groupDateRange && groupDateRange[0] && groupDateRange[1]) {
      filtered = filtered.filter((group) => {
        if (!group.createdAt) return false;
        const createdAt = dayjs(group.createdAt);
        const startDate = groupDateRange[0]!.startOf("day");
        const endDate = groupDateRange[1]!.endOf("day");
        return (
          (createdAt.isAfter(startDate) || createdAt.isSame(startDate)) &&
          (createdAt.isBefore(endDate) || createdAt.isSame(endDate))
        );
      });
    }

    return filtered;
  }, [gradingGroups, groupSearch, groupDateRange]);

  // Filter grading sessions
  const filteredGradingSessions = useMemo(() => {
    let filtered = [...gradingSessions];

    if (sessionSearch) {
      const searchLower = sessionSearch.toLowerCase();
      filtered = filtered.filter(
        (session) =>
          session.submissionStudentName?.toLowerCase().includes(searchLower) ||
          session.submissionStudentCode?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedSessionStatus !== undefined) {
      filtered = filtered.filter((session) => session.status === selectedSessionStatus);
    }

    if (selectedSessionType !== undefined) {
      filtered = filtered.filter((session) => session.gradingType === selectedSessionType);
    }

    if (sessionDateRange && sessionDateRange[0] && sessionDateRange[1]) {
      filtered = filtered.filter((session) => {
        if (!session.createdAt) return false;
        const createdAt = dayjs(session.createdAt);
        const startDate = sessionDateRange[0]!.startOf("day");
        const endDate = sessionDateRange[1]!.endOf("day");
        return (
          (createdAt.isAfter(startDate) || createdAt.isSame(startDate)) &&
          (createdAt.isBefore(endDate) || createdAt.isSame(endDate))
        );
      });
    }

    return filtered;
  }, [gradingSessions, sessionSearch, selectedSessionStatus, selectedSessionType, sessionDateRange]);

  // Filter assign requests
  const filteredAssignRequests = useMemo(() => {
    let filtered = [...assignRequests];

    if (requestSearch) {
      const searchLower = requestSearch.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.courseElementName?.toLowerCase().includes(searchLower) ||
          request.courseName?.toLowerCase().includes(searchLower) ||
          request.assignedLecturerName?.toLowerCase().includes(searchLower) ||
          request.assignedByHODName?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedRequestStatus !== undefined) {
      filtered = filtered.filter((request) => request.status === selectedRequestStatus);
    }

    if (requestDateRange && requestDateRange[0] && requestDateRange[1]) {
      filtered = filtered.filter((request) => {
        if (!request.createdAt) return false;
        const createdAt = dayjs(request.createdAt);
        const startDate = requestDateRange[0]!.startOf("day");
        const endDate = requestDateRange[1]!.endOf("day");
        return (
          (createdAt.isAfter(startDate) || createdAt.isSame(startDate)) &&
          (createdAt.isBefore(endDate) || createdAt.isSame(endDate))
        );
      });
    }

    return filtered;
  }, [assignRequests, requestSearch, selectedRequestStatus, requestDateRange]);

  if (!overview) return null;

  const gradingGroupColumns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Lecturer",
      key: "lecturer",
      render: (_: any, record: any) => (
        <Space>
          <UserOutlined />
          <span>{record.lecturerName || "N/A"} ({record.lecturerCode || "N/A"})</span>
        </Space>
      ),
    },
    {
      title: "Assessment Template",
      dataIndex: "assessmentTemplateName",
      key: "assessmentTemplateName",
      render: (name: string) => name || "N/A",
    },
    {
      title: "Submissions",
      dataIndex: "submissionCount",
      key: "submissionCount",
      render: (count: number) => (
        <Tag color="blue">{count || 0}</Tag>
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
    },
  ];

  const sessionColumns = [
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
          <span>{record.submissionStudentName} ({record.submissionStudentCode})</span>
        </Space>
      ),
    },
    {
      title: "Grade",
      dataIndex: "grade",
      key: "grade",
      render: (grade: number) => (
        <Tag color={grade > 0 ? "green" : "default"}>
          {grade > 0 ? grade.toFixed(2) : "N/A"}
        </Tag>
      ),
    },
    {
      title: "Type",
      dataIndex: "gradingType",
      key: "gradingType",
      render: (type: number) => {
        const types = ["AI", "Lecturer", "Both"];
        const colors = ["blue", "purple", "green"];
        return <Tag color={colors[type] || "default"}>{types[type] || "Unknown"}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: number) => {
        const statusMap: Record<number, { text: string; color: string }> = {
          0: { text: "Processing", color: "orange" },
          1: { text: "Completed", color: "green" },
          2: { text: "Failed", color: "red" },
        };
        const statusInfo = statusMap[status] || { text: "Unknown", color: "default" };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY HH:mm"),
    },
  ];

  const requestColumns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Course Element",
      dataIndex: "courseElementName",
      key: "courseElementName",
    },
    {
      title: "Course",
      dataIndex: "courseName",
      key: "courseName",
    },
    {
      title: "Lecturer",
      dataIndex: "assignedLecturerName",
      key: "assignedLecturerName",
    },
    {
      title: "HOD",
      dataIndex: "assignedByHODName",
      key: "assignedByHODName",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: number) => {
        const statusMap: Record<number, { text: string; color: string }> = {
          0: { text: "Pending", color: "orange" },
          1: { text: "Approved", color: "green" },
          2: { text: "Rejected", color: "red" },
        };
        const statusInfo = statusMap[status] || { text: "Unknown", color: "default" };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
    },
  ];

  const pendingRequests = assignRequests.filter((r) => r.status === 0);
  const completedSessions = gradingSessions.filter((s) => s.status === 1);
  const processingSessions = gradingSessions.filter((s) => s.status === 0);
  const failedSessions = gradingSessions.filter((s) => s.status === 2);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* Export Button Header */}
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>Grading Dashboard</Title>
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

      {/* Grading Statistics Overview */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Grading Statistics Overview</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Grading Groups"
              value={overview.grading.totalGradingGroups}
                prefix={<TeamOutlined />}
              valueStyle={{ color: COLORS.blue }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
                title="Total Sessions"
              value={overview.grading.totalGradingSessions}
              prefix={<FileTextOutlined />}
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
      </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Processing Sessions"
                value={overview.grading.gradingSessionsByStatus?.processing || processingSessions.length}
                prefix={<ThunderboltOutlined />}
              valueStyle={{ color: COLORS.orange }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Failed Sessions"
                value={overview.grading.gradingSessionsByStatus?.failed || failedSessions.length}
                prefix={<WarningOutlined />}
              valueStyle={{ color: COLORS.red }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completion Rate"
              value={
                gradingSessions.length > 0
                  ? Math.round((completedSessions.length / gradingSessions.length) * 100)
                  : 0
              }
              suffix="%"
                prefix={<TrophyOutlined />}
              valueStyle={{ color: COLORS.green }}
            />
            <Progress
              percent={
                gradingSessions.length > 0
                  ? Math.round((completedSessions.length / gradingSessions.length) * 100)
                  : 0
              }
              size="small"
                style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
                title="Average Grading Time"
                value={overview.grading.averageGradingTime || 0}
                suffix="hours"
                precision={1}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: COLORS.purple }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Grading Sessions by Type */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Grading Sessions by Type</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="AI Grading"
                value={overview.grading.gradingSessionsByType?.ai || 0}
                prefix={<RobotOutlined />}
              valueStyle={{ color: COLORS.blue }}
            />
          </Card>
        </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Lecturer Grading"
                value={overview.grading.gradingSessionsByType?.lecturer || 0}
                prefix={<SolutionOutlined />}
                valueStyle={{ color: COLORS.purple }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Both (AI + Lecturer)"
                value={overview.grading.gradingSessionsByType?.both || 0}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
      </Row>
      </Card>

      {/* Grading Groups by Status */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Grading Groups by Status</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Groups"
                value={overview.grading.gradingGroupsByStatus?.active || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completed Groups"
                value={overview.grading.gradingGroupsByStatus?.completed || 0}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Grading Performance (Last 30 Days)" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData?.gradingPerformance || []}>
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

        <Col xs={24} lg={12}>
          <Card title="Session Status Distribution" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: "Completed", value: completedSessions.length },
                  { name: "Processing", value: processingSessions.length },
                  { name: "Failed", value: failedSessions.length },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="value" fill={COLORS.blue} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Grading Groups Table */}
      <Card
        title="Grading Groups"
        loading={gradingGroupsLoading}
        extra={
          <Space>
            <RangePicker
              placeholder={["Start Date", "End Date"]}
              value={groupDateRange}
              onChange={(dates) => setGroupDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
              style={{ width: 250 }}
              allowClear
            />
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Search
            placeholder="Search by lecturer name, code, or assessment template"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
            onSearch={setGroupSearch}
          />
          <Text type="secondary">
            Showing {filteredGradingGroups.length} of {gradingGroups.length} grading groups
          </Text>
        </Space>
        <Table
          columns={gradingGroupColumns}
          dataSource={filteredGradingGroups}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} grading groups` }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Grading Sessions Table */}
      <Card
        title="Grading Sessions"
        loading={sessionsLoading}
        extra={
          <Space>
            <Select
              placeholder="Filter by Status"
              allowClear
              style={{ width: 150 }}
              value={selectedSessionStatus}
              onChange={setSelectedSessionStatus}
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value={0}>Processing</Select.Option>
              <Select.Option value={1}>Completed</Select.Option>
              <Select.Option value={2}>Failed</Select.Option>
            </Select>
            <Select
              placeholder="Filter by Type"
              allowClear
              style={{ width: 150 }}
              value={selectedSessionType}
              onChange={setSelectedSessionType}
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value={0}>AI</Select.Option>
              <Select.Option value={1}>Lecturer</Select.Option>
              <Select.Option value={2}>Both</Select.Option>
            </Select>
            <RangePicker
              placeholder={["Start Date", "End Date"]}
              value={sessionDateRange}
              onChange={(dates) => setSessionDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
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
            value={sessionSearch}
            onChange={(e) => setSessionSearch(e.target.value)}
            onSearch={setSessionSearch}
          />
          <Text type="secondary">
            Showing {filteredGradingSessions.length} of {gradingSessions.length} grading sessions
          </Text>
        </Space>
        <Table
          columns={sessionColumns}
          dataSource={filteredGradingSessions}
          rowKey="id"
          pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} grading sessions` }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Assign Requests Table */}
      <Card
        title="Assign Requests"
        loading={requestsLoading}
        extra={
          <Space>
            <Select
              placeholder="Filter by Status"
              allowClear
              style={{ width: 150 }}
              value={selectedRequestStatus}
              onChange={setSelectedRequestStatus}
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value={0}>Pending</Select.Option>
              <Select.Option value={1}>Approved</Select.Option>
              <Select.Option value={2}>Rejected</Select.Option>
            </Select>
            <RangePicker
              placeholder={["Start Date", "End Date"]}
              value={requestDateRange}
              onChange={(dates) => setRequestDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
              style={{ width: 250 }}
              allowClear
            />
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Search
            placeholder="Search by course element, course, lecturer, or HOD"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={requestSearch}
            onChange={(e) => setRequestSearch(e.target.value)}
            onSearch={setRequestSearch}
          />
          <Text type="secondary">
            Showing {filteredAssignRequests.length} of {assignRequests.length} assign requests
          </Text>
        </Space>
        <Table
          columns={requestColumns}
          dataSource={filteredAssignRequests}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} assign requests` }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </Space>
  );
};

export default GradingTab;

