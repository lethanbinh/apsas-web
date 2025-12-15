"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, Row, Col, Statistic, Table, Tag, Typography, Space, Input, Select, DatePicker, Button, App } from "antd";
import {
  BookOutlined,
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  FileTextOutlined,
  SearchOutlined,
  FilterOutlined,
  FileExcelOutlined,
  GlobalOutlined,
  SolutionOutlined,
  WarningOutlined,
  BarChartOutlined,
  UsergroupAddOutlined,
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
import { adminService } from "@/services/adminService";
import { classService } from "@/services/classService";
import type { DashboardOverview, ChartData } from "@/services/adminDashboardService";
import { Semester } from "@/types";
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

interface AcademicTabProps {
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

const AcademicTab: React.FC<AcademicTabProps> = ({
  overview,
  chartData,
  loading,
  filters,
}) => {
  const { message } = App.useApp();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [semestersLoading, setSemestersLoading] = useState(false);
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


      exportData.push(["ACADEMIC - KEY STATISTICS"]);
      exportData.push(["Metric", "Value"]);
      exportData.push(["Total Semesters", overview.academic.totalSemesters]);
      exportData.push(["Active Semesters", overview.academic.activeSemesters]);
      exportData.push(["Total Classes", overview.academic.totalClasses]);
      exportData.push(["Classes Without Students", overview.academic.classesWithoutStudents || 0]);
      exportData.push(["Average Students Per Class", overview.academic.averageStudentsPerClass?.toFixed(1) || 0]);
      exportData.push(["Semester Courses", overview.academic.semesterCourses || 0]);
      exportData.push(["Total Course Elements", overview.academic.totalCourseElements || 0]);
      exportData.push(["Total Students (All Classes)", classes.reduce((sum, cls) => sum + (parseInt(cls.studentCount || "0", 10) || 0), 0)]);
      exportData.push([]);


      if (chartData?.semesterActivity && chartData.semesterActivity.length > 0) {
        exportData.push(["SEMESTER ACTIVITY"]);
        exportData.push(["Semester", "Classes", "Courses", "Assessments", "Submissions"]);
        chartData.semesterActivity.forEach((item: any) => {
          exportData.push([item.semester, item.classes, item.courses, item.assessments, item.submissions]);
        });
        exportData.push([]);
      }


      if (overview.academic.classesBySemester && overview.academic.classesBySemester.length > 0) {
        exportData.push(["CLASSES BY SEMESTER"]);
        exportData.push(["Semester Code", "Class Count", "Student Count"]);
        overview.academic.classesBySemester.forEach((item: any) => {
          exportData.push([item.semesterCode, item.classCount, item.studentCount]);
        });
        exportData.push([]);
      }


      exportData.push(["ALL SEMESTERS"]);
      exportData.push(["No", "ID", "Semester Code", "Academic Year", "Start Date", "End Date", "Note", "Status"]);
      filteredSemesters.forEach((sem, index) => {
        exportData.push([
          index + 1,
          sem.id,
          sem.semesterCode,
          sem.academicYear,
          dayjs(sem.startDate).format("YYYY-MM-DD"),
          dayjs(sem.endDate).format("YYYY-MM-DD"),
          sem.note || "",
          dayjs().isAfter(dayjs(sem.startDate)) && dayjs().isBefore(dayjs(sem.endDate)) ? "Active" : "Inactive",
        ]);
      });
      exportData.push([]);


      exportData.push(["ALL CLASSES"]);
      exportData.push(["No", "ID", "Class Code", "Course Name", "Semester", "Lecturer", "Students"]);
      filteredClasses.forEach((cls, index) => {
        exportData.push([
          index + 1,
          cls.id,
          cls.classCode || "",
          cls.courseName || "",
          cls.semesterName || "",
          cls.lecturerName || "",
          parseInt(cls.studentCount || "0", 10),
        ]);
      });
      exportData.push([]);


      if (overview.academic.topClassesByStudents && overview.academic.topClassesByStudents.length > 0) {
        exportData.push(["TOP CLASSES BY STUDENTS"]);
        exportData.push(["Rank", "Class Code", "Course Name", "Lecturer", "Students"]);
        overview.academic.topClassesByStudents.forEach((item, index) => {
          exportData.push([
            index + 1,
            item.classCode,
            item.courseName,
            item.lecturerName,
            typeof item.studentCount === "string" ? parseInt(item.studentCount || "0", 10) : (item.studentCount || 0),
          ]);
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Academic");

      const fileName = `Academic_Dashboard_${dayjs().format("YYYY-MM-DD")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success("Academic data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export academic data");
    } finally {
      setExportLoading(false);
    }
  };
  const [classesLoading, setClassesLoading] = useState(false);
  const [semesterSearch, setSemesterSearch] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<string | undefined>(undefined);
  const [semesterDateRange, setSemesterDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [classDateRange, setClassDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setSemestersLoading(true);
      setClassesLoading(true);
      const [semestersData, classesData] = await Promise.all([
        adminService.getPaginatedSemesters(1, 100),
        classService.getClassList({ pageNumber: 1, pageSize: 1000 }),
      ]);
      setSemesters(semestersData);
      setClasses(classesData.classes);
    } catch (error) {
      console.error("Error fetching academic data:", error);
    } finally {
      setSemestersLoading(false);
      setClassesLoading(false);
    }
  };


  const filteredSemesters = useMemo(() => {
    let filtered = [...semesters];


    if (filters?.semesterCode) {
      filtered = filtered.filter((sem) => sem.semesterCode === filters.semesterCode);
    }

    if (semesterSearch) {
      const searchLower = semesterSearch.toLowerCase();
      filtered = filtered.filter(
        (sem) =>
          sem.semesterCode?.toLowerCase().includes(searchLower) ||
          sem.note?.toLowerCase().includes(searchLower)
      );
    }

    if (semesterDateRange && semesterDateRange[0] && semesterDateRange[1]) {
      filtered = filtered.filter((sem) => {
        const startDate = dayjs(sem.startDate);
        const endDate = dayjs(sem.endDate);
        const filterStart = semesterDateRange[0]!.startOf("day");
        const filterEnd = semesterDateRange[1]!.endOf("day");

        return (
          (startDate.isBefore(filterEnd) || startDate.isSame(filterEnd)) &&
          (endDate.isAfter(filterStart) || endDate.isSame(filterStart))
        );
      });
    }

    return filtered;
  }, [semesters, semesterSearch, semesterDateRange, filters?.semesterCode]);


  const filteredClasses = useMemo(() => {
    let filtered = [...classes];


    if (filters?.classId) {
      filtered = filtered.filter((cls) => cls.id === filters.classId);
    }
    if (filters?.courseId) {


      filtered = filtered.filter((cls) => {

        return true;
      });
    }
    if (filters?.semesterCode) {
      filtered = filtered.filter((cls) => cls.semesterName === filters.semesterCode);
    }

    if (classSearch) {
      const searchLower = classSearch.toLowerCase();
      filtered = filtered.filter(
        (cls) =>
          cls.classCode?.toLowerCase().includes(searchLower) ||
          cls.courseName?.toLowerCase().includes(searchLower) ||
          cls.lecturerName?.toLowerCase().includes(searchLower) ||
          cls.semesterName?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedSemester) {
      filtered = filtered.filter((cls) => cls.semesterName === selectedSemester);
    }

    if (classDateRange && classDateRange[0] && classDateRange[1]) {
      filtered = filtered.filter((cls) => {
        const createdAt = dayjs(cls.createdAt);
        return (
          createdAt.isAfter(classDateRange[0]!.subtract(1, "day")) &&
          createdAt.isBefore(classDateRange[1]!.add(1, "day"))
        );
      });
    }

    return filtered;
  }, [classes, classSearch, selectedSemester, classDateRange, filters]);

  if (!overview) return null;

  const semesterColumns = [
    {
      title: "Semester Code",
      dataIndex: "semesterCode",
      key: "semesterCode",
    },
    {
      title: "Academic Year",
      dataIndex: "academicYear",
      key: "academicYear",
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
    },
    {
      title: "Status",
      key: "status",
      render: (_: any, record: Semester) => {
        const now = new Date();
        const startDate = new Date(record.startDate);
        const endDate = new Date(record.endDate);
        const isActive = now >= startDate && now <= endDate;
        return (
          <Tag color={isActive ? "green" : "default"}>
            {isActive ? "Active" : "Inactive"}
          </Tag>
        );
      },
    },
  ];

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
      title: "Semester",
      dataIndex: "semesterName",
      key: "semesterName",
    },
    {
      title: "Lecturer",
      dataIndex: "lecturerName",
      key: "lecturerName",
    },
    {
      title: "Students",
      dataIndex: "studentCount",
      key: "studentCount",
      render: (count: string) => parseInt(count) || 0,
      sorter: (a: any, b: any) => (parseInt(a.studentCount) || 0) - (parseInt(b.studentCount) || 0),
    },
  ];

  const semesterActivityData = chartData?.semesterActivity || [];
  const classesBySemesterData = overview.academic.classesBySemester || [];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {}
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>Academic Dashboard</Title>
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
        <Title level={5} style={{ marginBottom: 16 }}>Semester & Course Statistics</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Semesters"
              value={overview.academic.totalSemesters}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: COLORS.blue }}
            />
          </Card>
        </Col>
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
                title="Course Elements"
                value={overview.academic.totalCourseElements || 0}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: COLORS.cyan }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Class Statistics</Title>
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
              title="Average Students/Class"
              value={overview.academic.averageStudentsPerClass || 0}
                prefix={<BarChartOutlined />}
              valueStyle={{ color: COLORS.orange }}
              precision={1}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Classes Without Students"
              value={overview.academic.classesWithoutStudents || 0}
                prefix={<WarningOutlined />}
              valueStyle={{ color: COLORS.red }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
                title="Classes Overloaded (>50)"
                value={overview.academic.classesOverloaded || 0}
                prefix={<WarningOutlined />}
                valueStyle={{ color: COLORS.red }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>People Statistics</Title>
        <Row gutter={[16, 16]}>
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
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
                title="Student/Lecturer Ratio"
                value={overview.academic.studentToLecturerRatio || 0}
              prefix={<TeamOutlined />}
                valueStyle={{ color: COLORS.purple }}
                precision={1}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Semester Courses"
                value={overview.academic.semesterCourses || 0}
                prefix={<FileTextOutlined />}
              valueStyle={{ color: COLORS.green }}
            />
          </Card>
        </Col>
      </Row>
      </Card>

      {}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Semester Activity" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={semesterActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semester" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="classes" fill={COLORS.blue} name="Classes" />
                <Bar dataKey="courses" fill={COLORS.green} name="Courses" />
                <Bar dataKey="assessments" fill={COLORS.purple} name="Assessments" />
                <Bar dataKey="submissions" fill={COLORS.orange} name="Submissions" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Classes by Semester" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={classesBySemesterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semesterCode" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="classCount"
                  stroke={COLORS.blue}
                  name="Classes"
                />
                <Line
                  type="monotone"
                  dataKey="studentCount"
                  stroke={COLORS.green}
                  name="Students"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {}
      {overview.academic.topClassesByStudents && overview.academic.topClassesByStudents.length > 0 && (
        <Card title="Top Classes by Student Count">
          <Table
            columns={[
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
                title: "Lecturer",
                dataIndex: "lecturerName",
                key: "lecturerName",
              },
              {
                title: "Students",
                dataIndex: "studentCount",
                key: "studentCount",
                render: (count: number) => (
                  <Tag color="blue">{count}</Tag>
                ),
              },
            ]}
            dataSource={overview.academic.topClassesByStudents}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {}
      <Card
        title="All Semesters"
        loading={semestersLoading}
        extra={
          <Space>
            <RangePicker
              placeholder={["Start Date", "End Date"]}
              value={semesterDateRange}
              onChange={(dates) => setSemesterDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
              style={{ width: 250 }}
              allowClear
            />
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Search
            placeholder="Search by semester code or note"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={semesterSearch}
            onChange={(e) => setSemesterSearch(e.target.value)}
            onSearch={setSemesterSearch}
          />
          <Text type="secondary">
            Showing {filteredSemesters.length} of {semesters.length} semesters
          </Text>
        </Space>
        <Table
          columns={semesterColumns}
          dataSource={filteredSemesters}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} semesters` }}
        />
      </Card>

      {}
      <Card
        title="All Classes"
        loading={classesLoading}
        extra={
          <Space>
            <Select
              placeholder="Filter by Semester"
              allowClear
              style={{ width: 200 }}
              value={selectedSemester}
              onChange={setSelectedSemester}
              suffixIcon={<FilterOutlined />}
            >
              {semesters.map((sem) => (
                <Select.Option key={sem.id} value={sem.semesterCode}>
                  {sem.semesterCode}
                </Select.Option>
              ))}
            </Select>
            <RangePicker
              placeholder={["Start Date", "End Date"]}
              value={classDateRange}
              onChange={(dates) => setClassDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
              style={{ width: 250 }}
              allowClear
            />
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Search
            placeholder="Search by class code, course, lecturer, or semester"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={classSearch}
            onChange={(e) => setClassSearch(e.target.value)}
            onSearch={setClassSearch}
          />
          <Text type="secondary">
            Showing {filteredClasses.length} of {classes.length} classes
          </Text>
        </Space>
        <Table
          columns={classColumns}
          dataSource={filteredClasses}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} classes` }}
          scroll={{ x: 800 }}
        />
      </Card>
    </Space>
  );
};

export default AcademicTab;

