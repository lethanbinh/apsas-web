"use client";

import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { queryKeys } from "@/lib/react-query";
import { adminService } from "@/services/adminService";
import { classService } from "@/services/classService";
import { courseElementService } from "@/services/courseElementService";
import { semesterService } from "@/services/semesterService";
import { ReloadOutlined, UserOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, DatePicker, Select, Space, Table, Tag, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard/DashboardAdmin.module.css";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const COLORS = {
  blue: "#2563EB",
  green: "#10B981",
  purple: "#6D28D9",
  orange: "#F59E0B",
  red: "#EF4444",
};

const UsersPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const { data: usersRes, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { users } = await adminService.getAccountList(1, 1000);
      // Filter out role 4 (same as userStatsService)
      return users.filter((user) => user.role !== 4);
    },
  });

  const users = usersRes || [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
  };

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    if (selectedRole !== undefined) {
      filtered = filtered.filter((user) => user.role === selectedRole);
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      filtered = filtered.filter((user) => {
        // Check if createdAt exists at runtime (API may return it even if not in type)
        const createdAt = (user as any).createdAt;
        if (!createdAt) return false;
        const userDate = dayjs(createdAt);
        return userDate.isAfter(startDate.subtract(1, 'day')) && userDate.isBefore(endDate.add(1, 'day'));
      });
    }

    return filtered;
  }, [users, selectedRole, dateRange?.[0]?.valueOf(), dateRange?.[1]?.valueOf()]);

  const getRoleName = (role: number) => {
    const roles = ["Admin", "Lecturer", "Student", "HOD"];
    return roles[role] || "Unknown";
  };

  const getRoleColor = (role: number) => {
    const colors = ["red", "purple", "green", "blue"];
    return colors[role] || "default";
  };

  const columns = [
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
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string | undefined, record: any) => {
        const createdAt = date || record.createdAt;
        return createdAt ? dayjs(createdAt).format("YYYY-MM-DD") : "-";
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
              <UserOutlined /> Users Management
            </Title>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={usersLoading}
          >
            Refresh
          </Button>
        </div>

        <Card>
          <Title level={5} style={{ marginBottom: 16 }}>Filters</Title>
          <Space size="large" wrap>
            <Space>
              <span style={{ fontWeight: 500 }}>Role:</span>
              <Select
                placeholder="All Roles"
                allowClear
                style={{ width: 150 }}
                value={selectedRole}
                onChange={setSelectedRole}
              >
                <Select.Option value={0}>Admin</Select.Option>
                <Select.Option value={1}>Lecturer</Select.Option>
                <Select.Option value={2}>Student</Select.Option>
                <Select.Option value={3}>HOD</Select.Option>
              </Select>
            </Space>
            <Space>
              <span style={{ fontWeight: 500 }}>Registration Date:</span>
              <RangePicker
                placeholder={["Start Date", "End Date"]}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                style={{ width: 250 }}
                allowClear
              />
            </Space>
          </Space>
        </Card>

        <Card
          title={`All Users (${filteredUsers.length} of ${users.length})`}
          loading={usersLoading}
        >
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} users` }}
            scroll={{ x: 800 }}
          />
        </Card>
      </div>
    </>
  );
};

export default UsersPage;

