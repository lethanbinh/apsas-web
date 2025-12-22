"use client";

import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { queryKeys } from "@/lib/react-query";
import { adminService } from "@/services/adminService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { isLabTemplate, isPracticalExamTemplate } from "@/services/adminDashboard/utils";
import { FileTextOutlined, ReloadOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, DatePicker, Divider, Select, Space, Table, Tag, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

const AssessmentsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedTemplateType, setSelectedTemplateType] = useState<string | undefined>(undefined);
  const [selectedAssessmentStatus, setSelectedAssessmentStatus] = useState<number | undefined>(undefined);
  const [templateDateRange, setTemplateDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [assessmentDateRange, setAssessmentDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { data: templatesRes, isLoading: templatesLoading } = useQuery({
    queryKey: ['adminTemplates'],
    queryFn: () => adminService.getAssessmentTemplateList(1, 1000),
  });

  const { data: assessmentsRes, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['adminAssessments'],
    queryFn: () => classAssessmentService.getClassAssessments({ pageNumber: 1, pageSize: 1000 }),
  });

  const templates = templatesRes?.items || [];
  const assessments = assessmentsRes?.items || [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['adminTemplates'] });
    queryClient.invalidateQueries({ queryKey: ['adminAssessments'] });
  };

  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    if (selectedTemplateType) {
      if (selectedTemplateType === "lab") {
        const labKeywords = ["lab", "laboratory", "thực hành"];
        filtered = filtered.filter((tpl) => {
          const nameLower = (tpl.name || "").toLowerCase();
          return labKeywords.some((keyword) => nameLower.includes(keyword));
        });
      } else if (selectedTemplateType === "practical_exam") {
        const peKeywords = ["exam", "pe", "practical exam", "test"];
        filtered = filtered.filter((tpl) => {
          const nameLower = (tpl.name || "").toLowerCase();
          return peKeywords.some((keyword) => nameLower.includes(keyword));
        });
      } else if (selectedTemplateType === "assignment") {
        const labKeywords = ["lab", "laboratory", "thực hành"];
        const peKeywords = ["exam", "pe", "practical exam", "test"];
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
  }, [templates, selectedTemplateType, templateDateRange?.[0]?.valueOf(), templateDateRange?.[1]?.valueOf()]);

  const filteredAssessments = useMemo(() => {
    let filtered = [...assessments];

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
  }, [assessments, selectedAssessmentStatus, assessmentDateRange?.[0]?.valueOf(), assessmentDateRange?.[1]?.valueOf()]);

  const assessmentTypeData = useMemo(() => {
    const data: Record<string, number> = {};
    
    // Create a map from template ID to template for quick lookup
    const templateMap = new Map(templates.map(t => [t.id, t]));
    
    filteredAssessments.forEach((ass) => {
      if (!ass.assessmentTemplateId) return;
      
      const template = templateMap.get(ass.assessmentTemplateId);
      if (!template) return;
      
      let type: string;
      if (isPracticalExamTemplate(template)) {
        type = "Practical Exam";
      } else if (isLabTemplate(template)) {
        type = "Lab";
      } else {
        type = "Assignment";
      }
      
      data[type] = (data[type] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [filteredAssessments, templates]);

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
      render: (date: string) => dayjs(date).format("YYYY-MM-DD"),
    },
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
    {
      title: "Start Date",
      dataIndex: "startAt",
      key: "startAt",
      render: (date: string) => date ? dayjs(date).format("YYYY-MM-DD") : "-",
    },
    {
      title: "End Date",
      dataIndex: "endAt",
      key: "endAt",
      render: (date: string) => date ? dayjs(date).format("YYYY-MM-DD") : "-",
    },
    {
      title: "Submissions",
      dataIndex: "submissionCount",
      key: "submissionCount",
      render: (count: string) => parseInt(count || "0", 10),
    },
  ];

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
              <FileTextOutlined /> Assessments Management
            </Title>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={templatesLoading || assessmentsLoading}
          >
            Refresh
          </Button>
        </div>

        <Card>
          <Title level={5} style={{ marginBottom: 16 }}>Filters</Title>
          <Space size="large" wrap>
            <Space>
              <span style={{ fontWeight: 500 }}>Template Type:</span>
              <Select
                placeholder="All Types"
                allowClear
                style={{ width: 150 }}
                value={selectedTemplateType}
                onChange={setSelectedTemplateType}
              >
                <Select.Option value="assignment">Assignment</Select.Option>
                <Select.Option value="lab">Lab</Select.Option>
                <Select.Option value="practical_exam">Practical Exam</Select.Option>
              </Select>
            </Space>
            <Space>
              <span style={{ fontWeight: 500 }}>Template Date Range:</span>
              <RangePicker
                placeholder={["Start Date", "End Date"]}
                value={templateDateRange}
                onChange={(dates) => setTemplateDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                style={{ width: 250 }}
                allowClear
              />
            </Space>
          </Space>
          <Divider />
          <Space size="large" wrap>
            <Space>
              <span style={{ fontWeight: 500 }}>Status:</span>
              <Select
                placeholder="All Statuses"
                allowClear
                style={{ width: 150 }}
                value={selectedAssessmentStatus}
                onChange={setSelectedAssessmentStatus}
              >
                <Select.Option value={0}>Pending</Select.Option>
                <Select.Option value={1}>Active</Select.Option>
                <Select.Option value={2}>Completed</Select.Option>
              </Select>
            </Space>
            <Space>
              <span style={{ fontWeight: 500 }}>Assessment Date Range:</span>
              <RangePicker
                placeholder={["Start Date", "End Date"]}
                value={assessmentDateRange}
                onChange={(dates) => setAssessmentDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                style={{ width: 250 }}
                allowClear
              />
            </Space>
          </Space>
        </Card>

        <Card title="Assessment Type Distribution" loading={assessmentsLoading} style={{ marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assessmentTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => {
                  const { name, percent } = props;
                  return `${name} ${((percent as number) * 100).toFixed(0)}%`;
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {assessmentTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={[COLORS.blue, COLORS.green, COLORS.purple][index % 3]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title={`Assessment Templates (${filteredTemplates.length} of ${templates.length})`}
          loading={templatesLoading}
          style={{ marginBottom: 24 }}
        >
          <Table
            columns={templateColumns}
            dataSource={filteredTemplates}
            rowKey="id"
            pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} templates` }}
            scroll={{ x: 1000 }}
          />
        </Card>

        <Card
          title={`Class Assessments (${filteredAssessments.length} of ${assessments.length})`}
          loading={assessmentsLoading}
        >
          <Table
            columns={assessmentColumns}
            dataSource={filteredAssessments}
            rowKey="id"
            pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} assessments` }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </div>
    </>
  );
};

export default AssessmentsPage;

