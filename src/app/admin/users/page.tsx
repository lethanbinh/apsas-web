"use client";
import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { adminService } from "@/services/adminService";
import { ArrowLeftOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Select, Space, Table, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "../dashboard/DashboardAdmin.module.css";
const { Title, Text } = Typography;
const UsersPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<number | undefined>(undefined);
  const { data: usersRes, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { users } = await adminService.getAccountList(1, 1000);
      return users;
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
    return filtered;
  }, [users, selectedRole]);
  const getRoleName = (role: number) => {
    const roles = ["Admin", "Lecturer", "Student", "HOD", "Examiner"];
    return roles[role] || "Unknown";
  };
  const getRoleColor = (role: number) => {
    const colors = ["red", "purple", "green", "blue", "orange"];
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
      title: "Phone Number",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      render: (phone: string) => phone || "-",
    },
    {
      title: "Date of Birth",
      dataIndex: "dateOfBirth",
      key: "dateOfBirth",
      render: (date: string) => {
        if (!date) return "-";
        try {
          return date.split('T')[0];
        } catch {
          return date;
        }
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
                <Select.Option value={4}>Examiner</Select.Option>
              </Select>
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