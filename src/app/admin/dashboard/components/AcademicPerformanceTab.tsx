"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  App,
  Spin,
  Progress,
  Alert,
} from "antd";
import {
  TrophyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  FileExcelOutlined,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  academicPerformanceService,
  AcademicPerformanceStats,
  AcademicPerformanceFilters,
} from "@/services/academicPerformanceService";

const { Title, Text } = Typography;

const COLORS = {
  blue: "#2563EB",
  green: "#10B981",
  purple: "#6D28D9",
  orange: "#F59E0B",
  red: "#EF4444",
  cyan: "#06B6D4",
};

const CHART_COLORS = ["#10B981", "#2563EB", "#F59E0B", "#EF4444", "#6D28D9"];

interface AcademicPerformanceTabProps {
  loading: boolean;
  onRefresh: () => void;
  filters?: AcademicPerformanceFilters;
}

const AcademicPerformanceTab: React.FC<AcademicPerformanceTabProps> = ({
  loading: parentLoading,
  onRefresh,
  filters,
}) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AcademicPerformanceStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await academicPerformanceService.getAcademicPerformanceStats(
        filters
      );
      setStats(data);
    } catch (err: any) {
      console.error("Error fetching academic performance stats:", err);
      setError(err.message || "Failed to load academic performance data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!stats) {
      message.warning("No data available to export");
      return;
    }

    try {
      setExportLoading(true);
      const wb = XLSX.utils.book_new();


      const overviewData = [
        ["Metric", "Value"],
        ["Total Students", stats.totalStudents],
        ["Total Classes", stats.totalClasses],
        ["Total Courses", stats.totalCourses],
        ["Total Assessments", stats.totalAssessments],
        ["Total Submissions", stats.totalSubmissions],
        ["Graded Submissions", stats.gradedSubmissions],
        ["Pass Count", stats.passCount],
        ["Fail Count", stats.failCount],
        ["Pass Rate (%)", stats.passRate],
        ["Not Graded Count", stats.notGradedCount],
        ["Overall Average Grade", stats.overallAverageGrade],
        ["Submission Rate (%)", stats.submissionRate],
        ["Grading Completion Rate (%)", stats.gradingCompletionRate],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, ws1, "Overview");


      const gradeDistData = [
        ["Grade", "Count"],
        ["A (>= 8.5)", stats.gradeDistribution.A],
        ["B (7.0 - 8.49)", stats.gradeDistribution.B],
        ["C (5.5 - 6.99)", stats.gradeDistribution.C],
        ["D (4.0 - 5.49)", stats.gradeDistribution.D],
        ["F (< 4.0)", stats.gradeDistribution.F],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(gradeDistData);
      XLSX.utils.book_append_sheet(wb, ws2, "Grade Distribution");


      const classData = [
        ["Class Code", "Course Name", "Average Grade", "Student Count", "Pass Count", "Fail Count"],
        ...stats.averageGradeByClass.map((c) => [
          c.classCode,
          c.courseName,
          c.averageGrade,
          c.studentCount,
          c.passCount,
          c.failCount,
        ]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(classData);
      XLSX.utils.book_append_sheet(wb, ws3, "By Class");


      const topStudentsData = [
        ["Student Code", "Student Name", "Average Grade", "Class Code", "Course Name"],
        ...stats.topStudents.map((s) => [
          s.studentCode,
          s.studentName,
          s.averageGrade,
          s.classCode,
          s.courseName,
        ]),
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(topStudentsData);
      XLSX.utils.book_append_sheet(wb, ws4, "Top Students");


      const topClassesData = [
        ["Class Code", "Course Name", "Average Grade", "Pass Rate (%)", "Student Count"],
        ...stats.topClasses.map((c) => [
          c.classCode,
          c.courseName,
          c.averageGrade,
          c.passRate.toFixed(2),
          c.studentCount,
        ]),
      ];
      const ws5 = XLSX.utils.aoa_to_sheet(topClassesData);
      XLSX.utils.book_append_sheet(wb, ws5, "Top Classes");


      const fileName = `Academic_Performance_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success("Excel file exported successfully");
    } catch (err: any) {
      console.error("Export error:", err);
      message.error("Failed to export Excel file");
    } finally {
      setExportLoading(false);
    }
  };


  const gradeDistributionData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "A (>= 8.5)", value: stats.gradeDistribution.A, color: COLORS.green },
      { name: "B (7.0-8.49)", value: stats.gradeDistribution.B, color: COLORS.blue },
      { name: "C (5.5-6.99)", value: stats.gradeDistribution.C, color: COLORS.orange },
      { name: "D (4.0-5.49)", value: stats.gradeDistribution.D, color: COLORS.purple },
      { name: "F (< 4.0)", value: stats.gradeDistribution.F, color: COLORS.red },
    ];
  }, [stats]);


  const classPerformanceData = useMemo(() => {
    if (!stats) return [];
    return stats.averageGradeByClass.slice(0, 10).map((c) => ({
      name: c.classCode,
      averageGrade: c.averageGrade,
      passRate: c.passCount / c.studentCount * 100,
    }));
  }, [stats]);

  if (loading || parentLoading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Spin size="large" tip="Loading academic performance data..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchData}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!stats) {
    return (
      <Alert
        message="No Data"
        description="No academic performance data available"
        type="info"
        showIcon
      />
    );
  }

  const classColumns = [
    {
      title: "Class Code",
      dataIndex: "classCode",
      key: "classCode",
    },
    {
      title: "Course Name",
      dataIndex: "courseName",
      key: "courseName",
    },
    {
      title: "Average Grade",
      dataIndex: "averageGrade",
      key: "averageGrade",
      render: (grade: number) => (
        <Tag color={grade >= 8.5 ? "green" : grade >= 7 ? "blue" : grade >= 5.5 ? "orange" : "red"}>
          {grade.toFixed(2)}
        </Tag>
      ),
      sorter: (a: any, b: any) => a.averageGrade - b.averageGrade,
    },
    {
      title: "Students",
      dataIndex: "studentCount",
      key: "studentCount",
    },
    {
      title: "Pass",
      dataIndex: "passCount",
      key: "passCount",
      render: (count: number, record: any) => (
        <Tag color="green">{count}</Tag>
      ),
    },
    {
      title: "Fail",
      dataIndex: "failCount",
      key: "failCount",
      render: (count: number, record: any) => (
        <Tag color="red">{count}</Tag>
      ),
    },
    {
      title: "Pass Rate",
      key: "passRate",
      render: (_: any, record: any) => {
        const rate = record.studentCount > 0 ? (record.passCount / record.studentCount) * 100 : 0;
        return (
          <Progress
            percent={rate}
            size="small"
            status={rate >= 80 ? "success" : rate >= 60 ? "normal" : "exception"}
          />
        );
      },
    },
  ];

  const topStudentsColumns = [
    {
      title: "Rank",
      key: "rank",
      render: (_: any, __: any, index: number) => index + 1,
      width: 60,
    },
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "studentCode",
    },
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
    },
    {
      title: "Average Grade",
      dataIndex: "averageGrade",
      key: "averageGrade",
      render: (grade: number) => (
        <Tag color={grade >= 8.5 ? "green" : grade >= 7 ? "blue" : grade >= 5.5 ? "orange" : "red"}>
          {grade.toFixed(2)}
        </Tag>
      ),
      sorter: (a: any, b: any) => a.averageGrade - b.averageGrade,
    },
    {
      title: "Class Code",
      dataIndex: "classCode",
      key: "classCode",
    },
    {
      title: "Course Name",
      dataIndex: "courseName",
      key: "courseName",
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={3}>Academic Performance</Title>
        <Button
          icon={<FileExcelOutlined />}
          onClick={handleExportExcel}
          loading={exportLoading}
        >
          Export Excel
        </Button>
      </div>

      {}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Overall Average Grade"
              value={stats.overallAverageGrade}
              precision={2}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: stats.overallAverageGrade >= 7 ? COLORS.green : stats.overallAverageGrade >= 5.5 ? COLORS.orange : COLORS.red }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pass Rate"
              value={stats.passRate}
              precision={2}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: COLORS.green }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pass Count"
              value={stats.passCount}
              prefix={<RiseOutlined />}
              valueStyle={{ color: COLORS.green }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Fail Count"
              value={stats.failCount}
              prefix={<FallOutlined />}
              valueStyle={{ color: COLORS.red }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Students"
              value={stats.totalStudents}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Classes"
              value={stats.totalClasses}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Submission Rate"
              value={stats.submissionRate}
              precision={2}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Grading Completion"
              value={stats.gradingCompletionRate}
              precision={2}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      {}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card title="Grade Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gradeDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }: any) => `${name}: ${value} (${((percent as number) * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {gradeDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Top 10 Classes by Average Grade">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis domain={[0, 10]} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="averageGrade" fill={COLORS.blue} name="Average Grade" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Average Grade by Class">
            <Table
              columns={classColumns}
              dataSource={stats.averageGradeByClass}
              rowKey="classId"
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: "max-content" }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top Students">
            <Table
              columns={topStudentsColumns}
              dataSource={stats.topStudents}
              rowKey="studentId"
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: "max-content" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AcademicPerformanceTab;

