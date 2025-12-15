"use client";

import React, { useMemo, useState } from "react";
import { Card, Row, Col, Statistic, Table, Typography, Space, Progress, Input, Select, DatePicker, Button, App } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
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
import type { DashboardOverview, ChartData } from "@/services/adminDashboardService";
import { useGradingData } from "./hooks/useGradingData";
import { useGradingFilters } from "./hooks/useGradingFilters";
import { exportGradingDataToExcel } from "./utils/exportGradingData";
import { gradingGroupColumns, sessionColumns, requestColumns } from "./utils/gradingTableColumns";

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
  filters?: {
    classId?: number;
    courseId?: number;
    semesterCode?: string;
  };
}

const GradingTab: React.FC<GradingTabProps> = ({
  overview,
  chartData,
  loading,
  filters,
}) => {
  const { message } = App.useApp();
  const [exportLoading, setExportLoading] = useState(false);


  const {
    gradingGroups,
    gradingSessions,
    assignRequests,
    gradingGroupsLoading,
    sessionsLoading,
    requestsLoading,
  } = useGradingData();


  const {
    groupSearch,
    setGroupSearch,
    groupDateRange,
    setGroupDateRange,
    filteredGradingGroups,
    sessionSearch,
    setSessionSearch,
    selectedSessionStatus,
    setSelectedSessionStatus,
    selectedSessionType,
    setSelectedSessionType,
    sessionDateRange,
    setSessionDateRange,
    filteredGradingSessions,
    requestSearch,
    setRequestSearch,
    selectedRequestStatus,
    setSelectedRequestStatus,
    requestDateRange,
    setRequestDateRange,
    filteredAssignRequests,
  } = useGradingFilters(gradingGroups, gradingSessions, assignRequests);

  const handleExportExcel = () => {
    if (!overview) {
      message.warning("No data available to export");
      return;
    }

    try {
      setExportLoading(true);
      exportGradingDataToExcel(
        overview,
        gradingSessions,
        filteredGradingGroups,
        filteredGradingSessions,
        filteredAssignRequests,
        chartData
      );
      message.success("Grading data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export grading data");
    } finally {
      setExportLoading(false);
    }
  };

  if (!overview) return null;

  const completedSessions = gradingSessions.filter((s) => s.status === 1);
  const processingSessions = gradingSessions.filter((s) => s.status === 0);
  const failedSessions = gradingSessions.filter((s) => s.status === 2);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {}
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

      {}
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

      {}
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

      {}
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

      {}
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

      {}
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

      {}
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

      {}
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

