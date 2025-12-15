"use client";

import type { ChartData, DashboardOverview } from "@/services/adminDashboardService";
import { adminService } from "@/services/adminService";
import { classAssessmentService } from "@/services/classAssessmentService";
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  FilterOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { App, Button, Card, Col, DatePicker, Input, Row, Select, Space, Statistic, Table, Tag, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis
} from "recharts";
import * as XLSX from "xlsx";

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

interface AssessmentsTabProps {
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

const AssessmentsTab: React.FC<AssessmentsTabProps> = ({
  overview,
  chartData,
  loading,
  filters,
}) => {
  const { message } = App.useApp();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
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
      const totalAssessments = overview.assessments.totalClassAssessments;


      exportData.push(["ASSESSMENTS - KEY STATISTICS"]);
      exportData.push(["Metric", "Value"]);
      exportData.push(["Total Templates", overview.assessments.totalTemplates]);
      exportData.push(["Total Class Assessments", totalAssessments]);
      exportData.push(["Active Assessments", overview.assessments.assessmentsByStatus?.active || 0]);
      exportData.push(["Completed Assessments", overview.assessments.assessmentsByStatus?.completed || 0]);
      exportData.push(["Pending Assessments", overview.assessments.assessmentsByStatus?.pending || 0]);
      exportData.push(["Average Submissions/Assessment", overview.assessments.averageSubmissionsPerAssessment?.toFixed(1) || 0]);
      exportData.push(["Assessments Without Submissions", overview.assessments.assessmentsWithoutSubmissions || 0]);
      exportData.push([]);


      exportData.push(["ASSESSMENTS BY TYPE"]);
      exportData.push(["Type", "Count", "Percentage"]);
      const assessmentDistribution = [
        { name: "Assignment", value: overview.assessments.byType.assignment },
        { name: "Lab", value: overview.assessments.byType.lab },
        { name: "Practical Exam", value: overview.assessments.byType.practicalExam },
      ];
      const totalByType = assessmentDistribution.reduce((sum, item) => sum + item.value, 0);
      assessmentDistribution.forEach((item) => {
        const percentage = totalByType > 0 ? ((item.value / totalByType) * 100).toFixed(2) + "%" : "0%";
        exportData.push([item.name, item.value, percentage]);
      });
      exportData.push([]);


      if (overview.assessments.topAssessmentsBySubmissions && overview.assessments.topAssessmentsBySubmissions.length > 0) {
        exportData.push(["TOP ASSESSMENTS BY SUBMISSIONS"]);
        exportData.push(["Rank", "Assessment Name", "Course Name", "Lecturer", "Submission Count"]);
        overview.assessments.topAssessmentsBySubmissions.forEach((item, index) => {
          exportData.push([
            index + 1,
            item.name,
            item.courseName,
            item.lecturerName,
            item.submissionCount,
          ]);
        });
        exportData.push([]);
      }


      if (overview.assessments.upcomingDeadlines && overview.assessments.upcomingDeadlines.length > 0) {
        exportData.push(["UPCOMING DEADLINES (NEXT 7 DAYS)"]);
        exportData.push(["Assessment Name", "End Date", "Days Remaining"]);
        overview.assessments.upcomingDeadlines.forEach((item) => {
          exportData.push([
            item.name,
            dayjs(item.endAt).format("YYYY-MM-DD"),
            item.daysRemaining,
          ]);
        });
        exportData.push([]);
      }


      exportData.push(["ALL ASSESSMENT TEMPLATES"]);
      exportData.push(["No", "ID", "Template Name", "Type", "Course Element", "Lecturer", "Description", "Created At"]);
      filteredTemplates.forEach((tpl, index) => {
        exportData.push([
          index + 1,
          tpl.id,
          tpl.name || "",
          tpl.templateType === 0 ? "Assignment" : tpl.templateType === 1 ? "Lab" : "Practical Exam",
          tpl.courseElementName || "",
          tpl.lecturerName || "",
          tpl.description || "",
          tpl.createdAt ? dayjs(tpl.createdAt).format("YYYY-MM-DD") : "",
        ]);
      });
      exportData.push([]);


      exportData.push(["ALL CLASS ASSESSMENTS"]);
      exportData.push(["No", "ID", "Assessment Name", "Course Element", "Course", "Lecturer", "Status", "Start Date", "End Date", "Submissions"]);
      filteredAssessments.forEach((ass, index) => {
        exportData.push([
          index + 1,
          ass.id,
          ass.assessmentTemplateName || "",
          ass.courseElementName || "",
          ass.courseName || "",
          ass.lecturerName || "",
          ass.status === 0 ? "Pending" : ass.status === 1 ? "Active" : "Completed",
          ass.startAt ? dayjs(ass.startAt).format("YYYY-MM-DD") : "",
          ass.endAt ? dayjs(ass.endAt).format("YYYY-MM-DD") : "",
          parseInt(ass.submissionCount || "0", 10),
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Assessments");

      const fileName = `Assessments_Dashboard_${dayjs().format("YYYY-MM-DD")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success("Assessments data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export assessments data");
    } finally {
      setExportLoading(false);
    }
  };
  const [templateSearch, setTemplateSearch] = useState("");
  const [assessmentSearch, setAssessmentSearch] = useState("");
  const [selectedTemplateType, setSelectedTemplateType] = useState<string | undefined>(undefined);
  const [selectedAssessmentStatus, setSelectedAssessmentStatus] = useState<number | undefined>(undefined);
  const [templateDateRange, setTemplateDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [assessmentDateRange, setAssessmentDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const fetchData = async () => {
    try {
      setAssessmentsLoading(true);
      const [assessmentsData, templatesData] = await Promise.all([
        classAssessmentService.getClassAssessments({
          classId: filters?.classId,
          pageNumber: 1,
          pageSize: 1000,
        }),
        adminService.getAssessmentTemplateList(1, 1000),
      ]);
      setAssessments(assessmentsData.items);
      setTemplates(templatesData.items);
    } catch (error) {
      console.error("Error fetching assessments data:", error);
    } finally {
      setAssessmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

  }, [filters?.classId, filters?.courseId, filters?.semesterCode]);


  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    if (templateSearch) {
      const searchLower = templateSearch.toLowerCase();
      filtered = filtered.filter(
        (tpl) =>
          tpl.name?.toLowerCase().includes(searchLower) ||
          tpl.description?.toLowerCase().includes(searchLower) ||
          tpl.courseElementName?.toLowerCase().includes(searchLower) ||
          tpl.lecturerName?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedTemplateType) {
      if (selectedTemplateType === "lab") {
        const labKeywords = ["lab", "laboratory", "thực hành", "bài thực hành", "lab session", "lab work"];
        filtered = filtered.filter((tpl) => {
          const nameLower = (tpl.name || "").toLowerCase();
          return labKeywords.some((keyword) => nameLower.includes(keyword));
        });
      } else if (selectedTemplateType === "practical_exam") {
        const peKeywords = ["exam", "pe", "practical exam", "practical", "test", "kiểm tra thực hành", "thi thực hành", "bài thi", "bài kiểm tra"];
        filtered = filtered.filter((tpl) => {
          const nameLower = (tpl.name || "").toLowerCase();
          return peKeywords.some((keyword) => nameLower.includes(keyword));
        });
      } else if (selectedTemplateType === "assignment") {

        const labKeywords = ["lab", "laboratory", "thực hành", "bài thực hành", "lab session", "lab work"];
        const peKeywords = ["exam", "pe", "practical exam", "practical", "test", "kiểm tra thực hành", "thi thực hành", "bài thi", "bài kiểm tra"];
        filtered = filtered.filter((tpl) => {
          const nameLower = (tpl.name || "").toLowerCase();
          return (
            !labKeywords.some((keyword) => nameLower.includes(keyword)) &&
            !peKeywords.some((keyword) => nameLower.includes(keyword))
          );
        });
      }
    }

    if (templateDateRange && templateDateRange[0] && templateDateRange[1]) {
      filtered = filtered.filter((tpl) => {
        if (!tpl.createdAt) return false;
        const createdAt = dayjs(tpl.createdAt);
        const startDate = templateDateRange[0]!.startOf("day");
        const endDate = templateDateRange[1]!.endOf("day");
        return (
          (createdAt.isAfter(startDate) || createdAt.isSame(startDate)) &&
          (createdAt.isBefore(endDate) || createdAt.isSame(endDate))
        );
      });
    }

    return filtered;
  }, [templates, templateSearch, selectedTemplateType, templateDateRange]);


  const filteredAssessments = useMemo(() => {
    let filtered = [...assessments];


    if (filters?.courseId) {


      filtered = filtered.filter((ass) => {

        return true;
      });
    }

    if (assessmentSearch) {
      const searchLower = assessmentSearch.toLowerCase();
      filtered = filtered.filter(
        (ass) =>
          ass.assessmentTemplateName?.toLowerCase().includes(searchLower) ||
          ass.courseElementName?.toLowerCase().includes(searchLower) ||
          ass.courseName?.toLowerCase().includes(searchLower) ||
          ass.lecturerName?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedAssessmentStatus !== undefined) {
      filtered = filtered.filter((ass) => ass.status === selectedAssessmentStatus);
    }

    if (assessmentDateRange && assessmentDateRange[0] && assessmentDateRange[1]) {
      filtered = filtered.filter((ass) => {
        const startAt = dayjs(ass.startAt);
        const endAt = dayjs(ass.endAt);
        return (
          (startAt.isAfter(assessmentDateRange[0]!.subtract(1, "day")) &&
            startAt.isBefore(assessmentDateRange[1]!.add(1, "day"))) ||
          (endAt.isAfter(assessmentDateRange[0]!.subtract(1, "day")) &&
            endAt.isBefore(assessmentDateRange[1]!.add(1, "day")))
        );
      });
    }

    return filtered;
  }, [assessments, assessmentSearch, selectedAssessmentStatus, assessmentDateRange, filters]);

  if (!overview) return null;

  const assessmentDistribution = [
    { name: "Assignment", value: overview.assessments.byType.assignment, color: COLORS.blue },
    { name: "Lab", value: overview.assessments.byType.lab, color: COLORS.green },
    { name: "Practical Exam", value: overview.assessments.byType.practicalExam, color: COLORS.purple },
  ];

  const assessmentColumns = [
    {
      title: "Assessment Name",
      dataIndex: "assessmentTemplateName",
      key: "assessmentTemplateName",
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
      dataIndex: "lecturerName",
      key: "lecturerName",
    },
    {
      title: "Start Date",
      dataIndex: "startAt",
      key: "startAt",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY HH:mm"),
    },
    {
      title: "End Date",
      dataIndex: "endAt",
      key: "endAt",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY HH:mm"),
    },
    {
      title: "Submissions",
      dataIndex: "submissionCount",
      key: "submissionCount",
      render: (count: string) => parseInt(count) || 0,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: number) => {
        const statusMap: Record<number, { text: string; color: string }> = {
          0: { text: "Pending", color: "orange" },
          1: { text: "Active", color: "green" },
          2: { text: "Completed", color: "blue" },
        };
        const statusInfo = statusMap[status] || { text: "Unknown", color: "default" };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
  ];

  const templateColumns = [
    {
      title: "Template Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Type",
      dataIndex: "templateType",
      key: "templateType",
      render: (type: number) => {
        const types = ["Assignment", "Lab", "Practical Exam"];
        const colors = ["blue", "green", "purple"];
        return <Tag color={colors[type] || "default"}>{types[type] || "Unknown"}</Tag>;
      },
    },
    {
      title: "Course Element",
      dataIndex: "courseElementName",
      key: "courseElementName",
    },
    {
      title: "Lecturer",
      dataIndex: "lecturerName",
      key: "lecturerName",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: number) => {
        const statusMap: Record<number, { text: string; color: string }> = {
          0: { text: "Draft", color: "orange" },
          1: { text: "Active", color: "green" },
          2: { text: "Archived", color: "default" },
        };
        const statusInfo = statusMap[status] || { text: "Unknown", color: "default" };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {}
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>Assessments Dashboard</Title>
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
        <Title level={5} style={{ marginBottom: 16 }}>Assessment Statistics Overview</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Templates"
              value={overview.assessments.totalTemplates}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: COLORS.blue }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Class Assessments"
              value={overview.assessments.totalClassAssessments}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: COLORS.cyan }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Assessments"
              value={overview.assessments.assessmentsByStatus?.active || 0}
                prefix={<ThunderboltOutlined />}
              valueStyle={{ color: COLORS.green }}
            />
          </Card>
        </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Completed Assessments"
                value={overview.assessments.assessmentsByStatus?.completed || 0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Assessments"
              value={overview.assessments.assessmentsByStatus?.pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: COLORS.orange }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
                title="Without Submissions"
                value={overview.assessments.assessmentsWithoutSubmissions || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: COLORS.red }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
                title="Avg Submissions/Assessment"
                value={overview.assessments.averageSubmissionsPerAssessment || 0}
                precision={1}
                prefix={<BarChartOutlined />}
              valueStyle={{ color: COLORS.purple }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
                title="Upcoming Deadlines"
                value={overview.assessments.upcomingDeadlines?.length || 0}
                prefix={<CalendarOutlined />}
              valueStyle={{ color: COLORS.orange }}
            />
          </Card>
        </Col>
      </Row>
      </Card>

      {}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Assessments by Type</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Assignments"
                value={overview.assessments.byType.assignment}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Labs"
                value={overview.assessments.byType.lab}
                prefix={<ExperimentOutlined />}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Practical Exams"
                value={overview.assessments.byType.practicalExam}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: COLORS.purple }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Assessment Type Distribution" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={assessmentDistribution}
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
                  {assessmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Assessment Distribution (Chart Data)" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData?.assessmentDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill={COLORS.blue} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {}
      {overview.assessments.topAssessmentsBySubmissions && overview.assessments.topAssessmentsBySubmissions.length > 0 && (
        <Card title="Top Assessments by Submissions">
          <Table
            columns={[
              {
                title: "Assessment Name",
                dataIndex: "name",
                key: "name",
              },
              {
                title: "Course",
                dataIndex: "courseName",
                key: "courseName",
              },
              {
                title: "Lecturer",
                dataIndex: "lecturerName",
                key: "lecturerName",
              },
              {
                title: "Submissions",
                dataIndex: "submissionCount",
                key: "submissionCount",
                render: (count: number) => (
                  <Tag color="blue">{count}</Tag>
                ),
              },
            ]}
            dataSource={overview.assessments.topAssessmentsBySubmissions}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {}
      <Card
        title="Assessment Templates"
        loading={assessmentsLoading}
        extra={
          <Space>
            <Select
              placeholder="Filter by Type"
              allowClear
              style={{ width: 150 }}
              value={selectedTemplateType}
              onChange={setSelectedTemplateType}
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value="assignment">Assignment</Select.Option>
              <Select.Option value="lab">Lab</Select.Option>
              <Select.Option value="practical_exam">Practical Exam</Select.Option>
            </Select>
            <RangePicker
              placeholder={["Start Date", "End Date"]}
              value={templateDateRange}
              onChange={(dates) => setTemplateDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
              style={{ width: 250 }}
              allowClear
            />
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Search
            placeholder="Search by name, description, course element, or lecturer"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            onSearch={setTemplateSearch}
          />
          <Text type="secondary">
            Showing {filteredTemplates.length} of {templates.length} templates
          </Text>
        </Space>
        <Table
          columns={templateColumns}
          dataSource={filteredTemplates}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} templates` }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {}
      <Card
        title="Class Assessments"
        loading={assessmentsLoading}
        extra={
          <Space>
            <Select
              placeholder="Filter by Status"
              allowClear
              style={{ width: 150 }}
              value={selectedAssessmentStatus}
              onChange={setSelectedAssessmentStatus}
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value={0}>Pending</Select.Option>
              <Select.Option value={1}>Active</Select.Option>
              <Select.Option value={2}>Completed</Select.Option>
            </Select>
            <RangePicker
              placeholder={["Start Date", "End Date"]}
              value={assessmentDateRange}
              onChange={(dates) => setAssessmentDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
              style={{ width: 250 }}
              allowClear
            />
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Search
            placeholder="Search by assessment name, course element, course, or lecturer"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={assessmentSearch}
            onChange={(e) => setAssessmentSearch(e.target.value)}
            onSearch={setAssessmentSearch}
          />
          <Text type="secondary">
            Showing {filteredAssessments.length} of {assessments.length} assessments
          </Text>
        </Space>
        <Table
          columns={assessmentColumns}
          dataSource={filteredAssessments}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} assessments` }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </Space>
  );
};

export default AssessmentsTab;