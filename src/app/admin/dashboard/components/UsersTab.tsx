"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card, Row, Col, Statistic, Table, Tag, Progress, Typography, Space, Input, Select, DatePicker, Button, App } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  ManOutlined,
  WomanOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  FileExcelOutlined,
  WarningOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
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
import { adminService } from "@/services/adminService";
import type { DashboardOverview, ChartData } from "@/services/adminDashboardService";
import { User } from "@/types";

const { Title, Text } = Typography;

const COLORS = {
  blue: "#2563EB",
  green: "#10B981",
  purple: "#6D28D9",
  orange: "#F59E0B",
  red: "#EF4444",
  cyan: "#06B6D4",
};

const CHART_COLORS = ["#2563EB", "#10B981", "#6D28D9", "#F59E0B", "#EF4444"];

interface UsersTabProps {
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

const { RangePicker } = DatePicker;
const { Search } = Input;

const UsersTab: React.FC<UsersTabProps> = ({
  overview,
  chartData,
  loading,
  filters,
}) => {
  const { message } = App.useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedRole, setSelectedRole] = useState<number | undefined>(undefined);
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
      const totalUsers = overview.users.total;

      // Section 1: Key Statistics
      exportData.push(["USERS - KEY STATISTICS"]);
      exportData.push(["Metric", "Value"]);
      exportData.push(["Total Users", overview.users.total]);
      exportData.push(["Active Users", overview.users.active]);
      exportData.push(["Inactive Users", overview.users.inactive || 0]);
      exportData.push(["Never Logged In", overview.users.neverLoggedIn || 0]);
      exportData.push(["New This Month", overview.users.newThisMonth]);
      exportData.push(["Active Rate (%)", totalUsers > 0 ? Math.round((overview.users.active / totalUsers) * 100) : 0]);
      exportData.push([]);

      // Section 2: Users by Role
      exportData.push(["USERS BY ROLE"]);
      exportData.push(["Role", "Count", "Percentage"]);
      roleDistribution.forEach((item) => {
        const percentage = totalUsers > 0 ? ((item.value / totalUsers) * 100).toFixed(2) + "%" : "0%";
        exportData.push([item.name, item.value, percentage]);
      });
      exportData.push([]);

      // Section 3: Gender Distribution
      exportData.push(["GENDER DISTRIBUTION"]);
      exportData.push(["Gender", "Count", "Percentage"]);
      genderDistribution.forEach((item) => {
        const percentage = totalUsers > 0 ? ((item.value / totalUsers) * 100).toFixed(2) + "%" : "0%";
        exportData.push([item.name, item.value, percentage]);
      });
      exportData.push([]);

      // Section 4: Profile Completion
      exportData.push(["PROFILE COMPLETION"]);
      exportData.push(["Metric", "Count", "Percentage"]);
      exportData.push(["Users With Avatar", overview.users.usersWithAvatar || 0, totalUsers > 0 ? ((overview.users.usersWithAvatar || 0) / totalUsers * 100).toFixed(2) + "%" : "0%"]);
      exportData.push(["Users With Phone", overview.users.usersWithPhone || 0, totalUsers > 0 ? ((overview.users.usersWithPhone || 0) / totalUsers * 100).toFixed(2) + "%" : "0%"]);
      exportData.push(["Average Age", overview.users.averageAge?.toFixed(1) || "N/A", ""]);
      exportData.push([]);

      // Section 5: User Growth (Last 12 Months)
      if (chartData?.userGrowth && chartData.userGrowth.length > 0) {
        exportData.push(["USER GROWTH (LAST 12 MONTHS)"]);
        exportData.push(["Month", "Total Users", "Students", "Lecturers"]);
        chartData.userGrowth.forEach((item) => {
          exportData.push([item.month, item.total, item.students, item.lecturers]);
        });
        exportData.push([]);
      }

      // Section 6: All Users
      const roleMap: Record<number, string> = {
        0: "Admin",
        1: "Lecturer",
        2: "Student",
        3: "HOD",
      };
      const genderMap: Record<number, string> = {
        0: "Male",
        1: "Female",
        2: "Other",
      };
      exportData.push(["ALL USERS"]);
      exportData.push(["No", "ID", "Full Name", "Email", "Account Code", "Username", "Role", "Gender", "Date of Birth", "Phone Number", "Address", "Has Avatar"]);
      filteredUsers.forEach((user, index) => {
        exportData.push([
          index + 1,
          user.id,
          user.fullName || "",
          user.email || "",
          user.accountCode || "",
          user.username || "",
          roleMap[user.role] || "Unknown",
          user.gender !== undefined ? genderMap[user.gender] || "" : "",
          user.dateOfBirth ? dayjs(user.dateOfBirth).format("YYYY-MM-DD") : "",
          user.phoneNumber || "",
          user.address || "",
          user.avatar ? "Yes" : "No",
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Users");

      const fileName = `Users_Dashboard_${dayjs().format("YYYY-MM-DD")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success("Users data exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      message.error("Failed to export users data");
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const { users: usersData } = await adminService.getAccountList(1, 1000);
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  // Filter users based on search, role, and date range
  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.fullName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.accountCode?.toLowerCase().includes(searchLower) ||
          user.username?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by role
    if (selectedRole !== undefined) {
      filtered = filtered.filter((user) => user.role === selectedRole);
    }

    // Filter by date range - Note: User interface doesn't have createdAt, so we'll skip date filtering for users
    // If you want to filter by dateOfBirth, uncomment below:
    // if (dateRange && dateRange[0] && dateRange[1]) {
    //   filtered = filtered.filter((user) => {
    //     if (!user.dateOfBirth) return false;
    //     const birthDate = dayjs(user.dateOfBirth);
    //     return birthDate.isAfter(dateRange[0]!.subtract(1, "day")) && birthDate.isBefore(dateRange[1]!.add(1, "day"));
    //   });
    // }

    return filtered;
  }, [users, searchText, selectedRole, dateRange]);

  if (!overview) return null;

  const roleDistribution = [
    { name: "Admin", value: overview.users.byRole.admin, color: COLORS.red },
    { name: "Lecturer", value: overview.users.byRole.lecturer, color: COLORS.purple },
    { name: "Student", value: overview.users.byRole.student, color: COLORS.green },
    { name: "HOD", value: overview.users.byRole.hod, color: COLORS.blue },
  ];

  const genderDistribution = [
    { name: "Male", value: overview.users.byGender?.male || 0, color: COLORS.blue },
    { name: "Female", value: overview.users.byGender?.female || 0, color: "#FFB6C1" },
    { name: "Other", value: overview.users.byGender?.other || 0, color: COLORS.orange },
  ];

  const getRoleName = (role: number) => {
    const roles = ["Admin", "Lecturer", "Student", "HOD"];
    return roles[role] || "Unknown";
  };

  const getRoleColor = (role: number) => {
    const colors = ["red", "purple", "green", "blue", "orange"];
    return colors[role] || "default";
  };

  const userColumns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: number) => (
        <Tag color={getRoleColor(role)}>{getRoleName(role)}</Tag>
      ),
    },
    {
      title: "Account Code",
      dataIndex: "accountCode",
      key: "accountCode",
    },
    {
      title: "Avatar",
      dataIndex: "avatar",
      key: "avatar",
      render: (avatar: string) => (
        <Tag color={avatar ? "green" : "default"}>
          {avatar ? "Yes" : "No"}
        </Tag>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      {/* Export Button Header */}
      <Card>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>Users Dashboard</Title>
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

      {/* User Statistics Overview */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>User Statistics Overview</Title>
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
                prefix={<UserAddOutlined />}
                valueStyle={{ color: COLORS.orange }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Inactive Users"
                value={overview.users.inactive || 0}
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
                title="With Avatar"
                value={overview.users.usersWithAvatar || 0}
                suffix={`/ ${overview.users.total}`}
                valueStyle={{ color: COLORS.cyan }}
              />
              <Progress
                percent={overview.users.total > 0 ? Math.round(((overview.users.usersWithAvatar || 0) / overview.users.total) * 100) : 0}
                size="small"
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="With Phone"
                value={overview.users.usersWithPhone || 0}
                suffix={`/ ${overview.users.total}`}
                valueStyle={{ color: COLORS.purple }}
              />
              <Progress
                percent={overview.users.total > 0 ? Math.round(((overview.users.usersWithPhone || 0) / overview.users.total) * 100) : 0}
                size="small"
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Average Age"
                value={overview.users.averageAge || 0}
                suffix="years"
                valueStyle={{ color: COLORS.orange }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Rate"
                value={overview.users.total > 0 ? Math.round((overview.users.active / overview.users.total) * 100) : 0}
                suffix="%"
                valueStyle={{ color: COLORS.green }}
              />
              <Progress
                percent={overview.users.total > 0 ? Math.round((overview.users.active / overview.users.total) * 100) : 0}
                size="small"
                style={{ marginTop: 8 }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Role Distribution */}
      <Card>
        <Title level={5} style={{ marginBottom: 16 }}>Users by Role</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Admins"
                value={overview.users.byRole.admin}
                valueStyle={{ color: COLORS.red }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Lecturers"
                value={overview.users.byRole.lecturer}
                valueStyle={{ color: COLORS.purple }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Students"
                value={overview.users.byRole.student}
                valueStyle={{ color: COLORS.green }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="HODs"
                value={overview.users.byRole.hod}
                valueStyle={{ color: COLORS.blue }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                valueStyle={{ color: COLORS.orange }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Never Logged In"
                value={overview.users.neverLoggedIn || 0}
                valueStyle={{ color: COLORS.red }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="Role Distribution" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleDistribution}
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
                  {roleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Gender Distribution" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={genderDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="value" fill={COLORS.blue} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="User Growth (Last 12 Months)" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData?.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="total" fill={COLORS.blue} name="Total Users" />
                <Bar dataKey="students" fill={COLORS.green} name="Students" />
                <Bar dataKey="lecturers" fill={COLORS.purple} name="Lecturers" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Users Table */}
      <Card
        title="All Users"
        loading={usersLoading}
        extra={
          <Space>
            <Select
              placeholder="Filter by Role"
              allowClear
              style={{ width: 150 }}
              value={selectedRole}
              onChange={setSelectedRole}
              suffixIcon={<FilterOutlined />}
            >
              <Select.Option value={0}>Admin</Select.Option>
              <Select.Option value={1}>Lecturer</Select.Option>
              <Select.Option value={2}>Student</Select.Option>
              <Select.Option value={3}>HOD</Select.Option>
            </Select>
            <RangePicker
              placeholder={["Start Date", "End Date"]}
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
              style={{ width: 250 }}
            />
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
          <Search
            placeholder="Search by name, email, account code, or username"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={setSearchText}
          />
          <Text type="secondary">
            Showing {filteredUsers.length} of {users.length} users
          </Text>
        </Space>
        <Table
          columns={userColumns}
          dataSource={filteredUsers}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} users` }}
          scroll={{ x: 800 }}
        />
      </Card>
    </Space>
  );
};

export default UsersTab;

