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
}

const { RangePicker } = DatePicker;
const { Search } = Input;

const UsersTab: React.FC<UsersTabProps> = ({
  overview,
  chartData,
  loading,
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

      // All Statistics Cards Sheet (8 cards)
      const statsData = [
        ["Metric", "Value"],
        ["Total Users", overview.users.total],
        ["Active Users", overview.users.active],
        ["New This Month", overview.users.newThisMonth],
        ["Students", overview.users.byRole.student],
        ["Lecturers", overview.users.byRole.lecturer],
        ["Admins", overview.users.byRole.admin],
        ["HODs", overview.users.byRole.hod],
        ["Examiners", overview.users.byRole.examiner],
        ["Active Rate (%)", overview.users.total > 0 ? Math.round((overview.users.active / overview.users.total) * 100) : 0],
        ["Users With Avatar", overview.users.usersWithAvatar || 0],
        ["Average Age", overview.users.averageAge?.toFixed(1) || "N/A"],
        ["Male", overview.users.byGender?.male || 0],
        ["Female", overview.users.byGender?.female || 0],
        ["Other", overview.users.byGender?.other || 0],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, ws1, "Statistics");

      // Role Distribution Chart Data (Pie Chart)
      const totalUsers = overview.users.total;
      const roleData = roleDistribution.map((item) => ({
        Role: item.name,
        Count: item.value,
        Percentage: totalUsers > 0 ? ((item.value / totalUsers) * 100).toFixed(2) + "%" : "0%",
      }));
      const ws2 = XLSX.utils.json_to_sheet(roleData);
      XLSX.utils.book_append_sheet(wb, ws2, "Role Distribution");

      // Gender Distribution Chart Data (Bar Chart)
      const genderData = genderDistribution.map((item) => ({
        Gender: item.name,
        Count: item.value,
        Percentage: totalUsers > 0 ? ((item.value / totalUsers) * 100).toFixed(2) + "%" : "0%",
      }));
      const ws3 = XLSX.utils.json_to_sheet(genderData);
      XLSX.utils.book_append_sheet(wb, ws3, "Gender Distribution");

      // User Growth Chart Data (Bar Chart - Last 12 Months)
      if (chartData?.userGrowth && chartData.userGrowth.length > 0) {
        const growthData = chartData.userGrowth.map((item) => ({
          Month: item.month,
          "Total Users": item.total,
          Students: item.students,
          Lecturers: item.lecturers,
        }));
        const ws4 = XLSX.utils.json_to_sheet(growthData);
        XLSX.utils.book_append_sheet(wb, ws4, "User Growth");
      }

      // All Users Table (Filtered)
      const roleMap: Record<number, string> = {
        0: "Admin",
        1: "Lecturer",
        2: "Student",
        3: "HOD",
        4: "Examiner",
      };
      const genderMap: Record<number, string> = {
        0: "Male",
        1: "Female",
        2: "Other",
      };
      const usersData = filteredUsers.map((user, index) => ({
        "No": index + 1,
        "ID": user.id,
        "Full Name": user.fullName || "",
        "Email": user.email || "",
        "Account Code": user.accountCode || "",
        "Username": user.username || "",
        "Role": roleMap[user.role] || "Unknown",
        "Gender": user.gender !== undefined ? genderMap[user.gender] || "" : "",
        "Date of Birth": user.dateOfBirth ? dayjs(user.dateOfBirth).format("YYYY-MM-DD") : "",
        "Phone Number": user.phoneNumber || "",
        "Address": user.address || "",
        "Has Avatar": user.avatar ? "Yes" : "No",
      }));
      const ws5 = XLSX.utils.json_to_sheet(usersData);
      XLSX.utils.book_append_sheet(wb, ws5, "All Users");

      const fileName = `Users_Dashboard_${dayjs().format("YYYY-MM-DD")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      message.success("All users data exported successfully");
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
    { name: "Examiner", value: overview.users.byRole.examiner, color: COLORS.orange },
  ];

  const genderDistribution = [
    { name: "Male", value: overview.users.byGender?.male || 0, color: COLORS.blue },
    { name: "Female", value: overview.users.byGender?.female || 0, color: "#FFB6C1" },
    { name: "Other", value: overview.users.byGender?.other || 0, color: COLORS.orange },
  ];

  const getRoleName = (role: number) => {
    const roles = ["Admin", "Lecturer", "Student", "HOD", "Examiner"];
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
                title="Examiners"
                value={overview.users.byRole.examiner}
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
              <Select.Option value={4}>Examiner</Select.Option>
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

