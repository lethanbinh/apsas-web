"use client";
import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { isLabTemplate, isPracticalExamTemplate } from "@/services/adminDashboard/utils";
import { adminService } from "@/services/adminService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { gradingGroupService } from "@/services/gradingGroupService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { courseElementService } from "@/services/courseElementService";
import { submissionService } from "@/services/submissionService";
import { ArrowLeftOutlined, FileTextOutlined, ReloadOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient, useQueries } from "@tanstack/react-query";
import { Button, Card, DatePicker, Divider, Select, Space, Table, Tag, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
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
  const { data: gradingGroupsRes, isLoading: gradingGroupsLoading } = useQuery({
    queryKey: ['adminGradingGroups'],
    queryFn: () => gradingGroupService.getGradingGroups({}),
  });
  const { data: allTemplatesRes } = useQuery({
    queryKey: ['adminAllTemplates'],
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({ pageNumber: 1, pageSize: 1000 }),
  });
  const { data: courseElementsRes } = useQuery({
    queryKey: ['adminCourseElements'],
    queryFn: () => courseElementService.getCourseElements({ pageNumber: 1, pageSize: 1000 }),
  });
  const templates = templatesRes?.items || [];
  const assessments = assessmentsRes?.items || [];
  const gradingGroups = gradingGroupsRes || [];
  const allTemplates = allTemplatesRes?.items || [];
  const courseElements = courseElementsRes || [];
  
  // Fetch submissions for each class assessment
  const classAssessmentIds = useMemo(() => {
    return assessments.map(a => a.id).filter(id => id !== undefined && id !== null) as number[];
  }, [assessments]);
  
  const submissionsQueries = useQueries({
    queries: classAssessmentIds.map((classAssessmentId) => ({
      queryKey: ['submissions', 'byClassAssessment', classAssessmentId],
      queryFn: () => submissionService.getSubmissionList({ classAssessmentId }),
      enabled: classAssessmentIds.length > 0,
    })),
  });
  
  const submissionCountMap = useMemo(() => {
    const map = new Map<number, number>();
    submissionsQueries.forEach((query, index) => {
      const classAssessmentId = classAssessmentIds[index];
      if (classAssessmentId && query.data) {
        map.set(classAssessmentId, query.data.length);
      }
    });
    return map;
  }, [submissionsQueries, classAssessmentIds]);
  
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['adminTemplates'] });
    queryClient.invalidateQueries({ queryKey: ['adminAssessments'] });
    queryClient.invalidateQueries({ queryKey: ['adminGradingGroups'] });
    queryClient.invalidateQueries({ queryKey: ['adminAllTemplates'] });
    queryClient.invalidateQueries({ queryKey: ['adminCourseElements'] });
    queryClient.invalidateQueries({ queryKey: ['submissions', 'byClassAssessment'] });
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
  // Map grading groups to assessment-like format for Practical Exam with submitted grade report
  const practicalExamFromGradingGroups = useMemo(() => {
    const templateMap = new Map(allTemplates.map(t => [t.id, t]));
    const courseElementMap = new Map(courseElements.map(ce => [ce.id, ce]));
    
    return gradingGroups
      .filter((group) => {
        if (!group.assessmentTemplateId) return false;
        const template = templateMap.get(group.assessmentTemplateId);
        if (!template) return false;
        if (!isPracticalExamTemplate(template)) return false;
        // Only include if grade report has been submitted
        return !!(group.submittedGradeSheetUrl || group.gradeSheetSubmittedAt);
      })
      .map((group) => {
        const template = templateMap.get(group.assessmentTemplateId!);
        const courseElement = template?.courseElementId 
          ? courseElementMap.get(template.courseElementId) 
          : null;
        
        return {
          id: `grading-group-${group.id}`,
          assessmentTemplateId: group.assessmentTemplateId,
          assessmentTemplateName: group.assessmentTemplateName || template?.name || "Practical Exam",
          courseElementId: template?.courseElementId,
          courseElementName: courseElement?.name || template?.courseElementName || "N/A",
          courseName: courseElement?.semesterCourse?.course?.name || "N/A",
          status: 2, // Completed (since grade report is submitted)
          startAt: group.createdAt,
          endAt: group.gradeSheetSubmittedAt || group.updatedAt,
          submissionCount: group.submissionCount || 0,
          isFromGradingGroup: true,
          gradingGroupId: group.id,
          lecturerName: group.lecturerName,
        };
      });
  }, [gradingGroups, allTemplates, courseElements]);
  
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
    
    // Add Practical Exam from grading groups
    let peFromGroups = [...practicalExamFromGradingGroups];
    if (selectedAssessmentStatus !== undefined) {
      peFromGroups = peFromGroups.filter((ass) => ass.status === selectedAssessmentStatus);
    }
    if (assessmentDateRange && assessmentDateRange[0] && assessmentDateRange[1]) {
      peFromGroups = peFromGroups.filter((ass) => {
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
    
    return [...filtered, ...peFromGroups];
  }, [assessments, practicalExamFromGradingGroups, selectedAssessmentStatus, assessmentDateRange?.[0]?.valueOf(), assessmentDateRange?.[1]?.valueOf()]);
  const assessmentTypeData = useMemo(() => {
    const data: Record<string, number> = {
      "Assignment": 0,
      "Lab": 0,
      "Practical Exam": 0,
    };
    const templateMap = new Map(allTemplates.map(t => [t.id, t]));
    const courseElementMap = new Map(courseElements.map(ce => [ce.id, ce]));
    
    // Count unique templates by type from filtered templates
    // This shows how many templates of each type exist
    const uniqueTemplateIds = new Set<number>();
    
    // Add templates from filtered templates
    filteredTemplates.forEach((template) => {
      uniqueTemplateIds.add(template.id);
    });
    
    // Add templates from filtered assessments (class assessments)
    filteredAssessments.forEach((ass: any) => {
      if (ass.assessmentTemplateId && !ass.isFromGradingGroup) {
        uniqueTemplateIds.add(ass.assessmentTemplateId);
      }
    });
    
    // Count templates by type
    uniqueTemplateIds.forEach((templateId) => {
      const template = templateMap.get(templateId);
      if (!template) return;
      
      let type: string;
      // Check by course element type first (most accurate)
      if (template.courseElementId) {
        const courseElement = courseElementMap.get(template.courseElementId);
        if (courseElement?.elementType === 2) {
          type = "Practical Exam";
        } else if (courseElement?.elementType === 1) {
          type = "Lab";
        } else if (isPracticalExamTemplate(template)) {
          type = "Practical Exam";
        } else if (isLabTemplate(template)) {
          type = "Lab";
        } else {
          type = "Assignment";
        }
      } else {
        // Fallback to name-based detection
      if (isPracticalExamTemplate(template)) {
        type = "Practical Exam";
      } else if (isLabTemplate(template)) {
        type = "Lab";
      } else {
        type = "Assignment";
        }
      }
      data[type] = (data[type] || 0) + 1;
    });
    
    // Also count Practical Exam templates from grading groups that have submitted grade report
    const practicalExamGradingGroupTemplateIds = new Set<number>();
    gradingGroups.forEach((group) => {
      if (group.assessmentTemplateId && (group.submittedGradeSheetUrl || group.gradeSheetSubmittedAt)) {
        const template = templateMap.get(group.assessmentTemplateId);
        if (template) {
          // Check if it's Practical Exam
          if (template.courseElementId) {
            const courseElement = courseElementMap.get(template.courseElementId);
            if (courseElement?.elementType === 2) {
              practicalExamGradingGroupTemplateIds.add(template.id);
            }
          } else if (isPracticalExamTemplate(template)) {
            practicalExamGradingGroupTemplateIds.add(template.id);
          }
        }
      }
    });
    
    // Add unique Practical Exam templates from grading groups
    practicalExamGradingGroupTemplateIds.forEach((templateId) => {
      if (!uniqueTemplateIds.has(templateId)) {
        data["Practical Exam"] = (data["Practical Exam"] || 0) + 1;
      }
    });
    
    return Object.entries(data)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredTemplates, filteredAssessments, gradingGroups, allTemplates, courseElements]);
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
      render: (type: number, record: any) => {
        // Determine type based on template name and course element
        const templateMap = new Map(allTemplates.map(t => [t.id, t]));
        const courseElementMap = new Map(courseElements.map(ce => [ce.id, ce]));
        const template = templateMap.get(record.id);
        
        let determinedType: string = "Assignment";
        let color: string = "blue";
        
        if (template) {
          // Check by course element type first (most accurate)
          if (template.courseElementId) {
            const courseElement = courseElementMap.get(template.courseElementId);
            if (courseElement?.elementType === 2) {
              determinedType = "Practical Exam";
              color = "purple";
            } else if (courseElement?.elementType === 1) {
              determinedType = "Lab";
              color = "green";
            } else if (isPracticalExamTemplate(template)) {
              determinedType = "Practical Exam";
              color = "purple";
            } else if (isLabTemplate(template)) {
              determinedType = "Lab";
              color = "green";
            }
          } else {
            // Fallback to name-based detection
            if (isPracticalExamTemplate(template)) {
              determinedType = "Practical Exam";
              color = "purple";
            } else if (isLabTemplate(template)) {
              determinedType = "Lab";
              color = "green";
            }
          }
        }
        
        return <Tag color={color}>{determinedType}</Tag>;
      },
    },
    {
      title: "Course Element",
      dataIndex: "courseElementName",
      key: "courseElementName",
    },
    {
      title: "Course",
      key: "course",
      render: (_: any, record: any) => {
        const templateMap = new Map(allTemplates.map(t => [t.id, t]));
        const courseElementMap = new Map(courseElements.map(ce => [ce.id, ce]));
        const template = templateMap.get(record.id);
        if (!template?.courseElementId) return "-";
        const courseElement = courseElementMap.get(template.courseElementId);
        return courseElement?.semesterCourse?.course?.name || "-";
      },
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
      render: (text: string, record: any) => (
        <Space>
          <span>{text}</span>
          {record.isFromGradingGroup && (
            <Tag color="purple">Practical Exam (Grading Group)</Tag>
          )}
        </Space>
      ),
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
      key: "submissions",
      render: (_: any, record: any) => {
        // For grading group assessments, use submissionCount from the record
        if (record.isFromGradingGroup) {
          return record.submissionCount || 0;
        }
        // For class assessments, get from submissionCountMap
        return submissionCountMap.get(record.id) || 0;
      },
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
            loading={templatesLoading || assessmentsLoading || gradingGroupsLoading}
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
        <Card 
          title="Assessment Template Type Distribution" 
          loading={templatesLoading || assessmentsLoading || gradingGroupsLoading} 
          style={{ marginBottom: 24 }}
        >
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
          title={`Class Assessments (${filteredAssessments.length} of ${assessments.length + practicalExamFromGradingGroups.length})`}
          loading={assessmentsLoading || gradingGroupsLoading}
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