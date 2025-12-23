"use client";
import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { adminService } from "@/services/adminService";
import { gradingGroupService } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import { CheckCircleOutlined, ReloadOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, DatePicker, Divider, Select, Space, Table, Tag, Typography } from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard/DashboardAdmin.module.css";
const { Title } = Typography;
const { RangePicker } = DatePicker;
const GradingPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [groupDateRange, setGroupDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedSessionStatus, setSelectedSessionStatus] = useState<number | undefined>(undefined);
  const [selectedSessionType, setSelectedSessionType] = useState<number | undefined>(undefined);
  const [sessionDateRange, setSessionDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [selectedRequestStatus, setSelectedRequestStatus] = useState<number | undefined>(undefined);
  const [requestDateRange, setRequestDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['adminGradingGroups'],
    queryFn: () => gradingGroupService.getGradingGroups({}),
  });
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['adminGradingSessions'],
    queryFn: () => gradingService.getGradingSessions({ pageNumber: 1, pageSize: 1000 }),
  });
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['adminAssignRequests'],
    queryFn: () => adminService.getApprovalList(1, 1000),
  });
  const gradingGroups = groupsData || [];
  const gradingSessions = sessionsData?.items || [];
  const assignRequests = requestsData?.items || [];
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['adminGradingGroups'] });
    queryClient.invalidateQueries({ queryKey: ['adminGradingSessions'] });
    queryClient.invalidateQueries({ queryKey: ['adminAssignRequests'] });
  };
  const filteredGradingGroups = useMemo(() => {
    let filtered = [...gradingGroups];
    if (groupDateRange && groupDateRange[0] && groupDateRange[1]) {
      filtered = filtered.filter((group) => {
        if (!group.createdAt) return false;
        const createdAt = dayjs(group.createdAt);
        const startDate = groupDateRange[0]!.startOf("day");
        const endDate = groupDateRange[1]!.endOf("day");
        return (
          (createdAt.isAfter(startDate) || createdAt.isSame(startDate)) &&
          (createdAt.isBefore(endDate) || createdAt.isSame(endDate))
        );
      });
    }
    return filtered;
  }, [gradingGroups, groupDateRange?.[0]?.valueOf(), groupDateRange?.[1]?.valueOf()]);
  const filteredGradingSessions = useMemo(() => {
    let filtered = [...gradingSessions];
    if (selectedSessionStatus !== undefined) {
      filtered = filtered.filter((session) => session.status === selectedSessionStatus);
    }
    if (selectedSessionType !== undefined) {
      filtered = filtered.filter((session) => session.gradingType === selectedSessionType);
    }
    if (sessionDateRange && sessionDateRange[0] && sessionDateRange[1]) {
      filtered = filtered.filter((session) => {
        if (!session.createdAt) return false;
        const createdAt = dayjs(session.createdAt);
        const startDate = sessionDateRange[0]!.startOf("day");
        const endDate = sessionDateRange[1]!.endOf("day");
        return (
          (createdAt.isAfter(startDate) || createdAt.isSame(startDate)) &&
          (createdAt.isBefore(endDate) || createdAt.isSame(endDate))
        );
      });
    }
    return filtered;
  }, [gradingSessions, selectedSessionStatus, selectedSessionType, sessionDateRange?.[0]?.valueOf(), sessionDateRange?.[1]?.valueOf()]);
  const filteredAssignRequests = useMemo(() => {
    let filtered = [...assignRequests];
    if (selectedRequestStatus !== undefined) {
      filtered = filtered.filter((request) => request.status === selectedRequestStatus);
    }
    if (requestDateRange && requestDateRange[0] && requestDateRange[1]) {
      filtered = filtered.filter((request) => {
        if (!request.createdAt) return false;
        const createdAt = dayjs(request.createdAt);
        const startDate = requestDateRange[0]!.startOf("day");
        const endDate = requestDateRange[1]!.endOf("day");
        return (
          (createdAt.isAfter(startDate) || createdAt.isSame(startDate)) &&
          (createdAt.isBefore(endDate) || createdAt.isSame(endDate))
        );
      });
    }
    return filtered;
  }, [assignRequests, selectedRequestStatus, requestDateRange?.[0]?.valueOf(), requestDateRange?.[1]?.valueOf()]);
  const groupColumns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Lecturer",
      key: "lecturer",
      render: (_: any, record: any) => (
        <span>{record.lecturerName} ({record.lecturerCode})</span>
      ),
    },
    {
      title: "Assessment Template",
      dataIndex: "assessmentTemplateName",
      key: "assessmentTemplateName",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => date ? dayjs(date).format("YYYY-MM-DD") : "-",
    },
  ];
  const sessionColumns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Student",
      key: "student",
      render: (_: any, record: any) => (
        <span>{record.submissionStudentName} ({record.submissionStudentCode})</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: number) => {
        const statusMap: Record<number, { text: string; color: string }> = {
          0: { text: "Pending", color: "orange" },
          1: { text: "In Progress", color: "blue" },
          2: { text: "Completed", color: "green" },
        };
        const statusInfo = statusMap[status] || { text: "Unknown", color: "default" };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: "Type",
      dataIndex: "gradingType",
      key: "gradingType",
      render: (type: number) => {
        const types = ["Manual", "Auto"];
        const colors = ["blue", "green"];
        return <Tag color={colors[type] || "default"}>{types[type] || "Unknown"}</Tag>;
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => date ? dayjs(date).format("YYYY-MM-DD") : "-",
    },
  ];
  const requestColumns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
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
      title: "Assigned Lecturer",
      dataIndex: "assignedLecturerName",
      key: "assignedLecturerName",
    },
    {
      title: "Assigned By",
      dataIndex: "assignedByHODName",
      key: "assignedByHODName",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: number) => {
        const statusMap: Record<number, { text: string; color: string }> = {
          0: { text: "Pending", color: "orange" },
          1: { text: "Approved", color: "green" },
          2: { text: "Rejected", color: "red" },
        };
        const statusInfo = statusMap[status] || { text: "Unknown", color: "default" };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => date ? dayjs(date).format("YYYY-MM-DD") : "-",
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
              <CheckCircleOutlined /> Grading Management
            </Title>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={groupsLoading || sessionsLoading || requestsLoading}
          >
            Refresh
          </Button>
        </div>
        <Card>
          <Title level={5} style={{ marginBottom: 16 }}>Filters</Title>
          <Space size="large" wrap>
            <Space>
              <span style={{ fontWeight: 500 }}>Group Date Range:</span>
              <RangePicker
                placeholder={["Start Date", "End Date"]}
                value={groupDateRange}
                onChange={(dates) => setGroupDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
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
                value={selectedSessionStatus}
                onChange={setSelectedSessionStatus}
              >
                <Select.Option value={0}>Pending</Select.Option>
                <Select.Option value={1}>In Progress</Select.Option>
                <Select.Option value={2}>Completed</Select.Option>
              </Select>
            </Space>
            <Space>
              <span style={{ fontWeight: 500 }}>Type:</span>
              <Select
                placeholder="All Types"
                allowClear
                style={{ width: 150 }}
                value={selectedSessionType}
                onChange={setSelectedSessionType}
              >
                <Select.Option value={0}>Manual</Select.Option>
                <Select.Option value={1}>Auto</Select.Option>
              </Select>
            </Space>
            <Space>
              <span style={{ fontWeight: 500 }}>Session Date Range:</span>
              <RangePicker
                placeholder={["Start Date", "End Date"]}
                value={sessionDateRange}
                onChange={(dates) => setSessionDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
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
                value={selectedRequestStatus}
                onChange={setSelectedRequestStatus}
              >
                <Select.Option value={0}>Pending</Select.Option>
                <Select.Option value={1}>Approved</Select.Option>
                <Select.Option value={2}>Rejected</Select.Option>
              </Select>
            </Space>
            <Space>
              <span style={{ fontWeight: 500 }}>Request Date Range:</span>
              <RangePicker
                placeholder={["Start Date", "End Date"]}
                value={requestDateRange}
                onChange={(dates) => setRequestDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                style={{ width: 250 }}
                allowClear
              />
            </Space>
          </Space>
        </Card>
        <Card
          title={`Grading Groups (${filteredGradingGroups.length} of ${gradingGroups.length})`}
          loading={groupsLoading}
          style={{ marginBottom: 24 }}
        >
          <Table
            columns={groupColumns}
            dataSource={filteredGradingGroups}
            rowKey="id"
            pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} groups` }}
            scroll={{ x: 800 }}
          />
        </Card>
        <Card
          title={`Grading Sessions (${filteredGradingSessions.length} of ${gradingSessions.length})`}
          loading={sessionsLoading}
          style={{ marginBottom: 24 }}
        >
          <Table
            columns={sessionColumns}
            dataSource={filteredGradingSessions}
            rowKey="id"
            pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} sessions` }}
            scroll={{ x: 800 }}
          />
        </Card>
        <Card
          title={`Assign Requests (${filteredAssignRequests.length} of ${assignRequests.length})`}
          loading={requestsLoading}
        >
          <Table
            columns={requestColumns}
            dataSource={filteredAssignRequests}
            rowKey="id"
            pagination={{ pageSize: 20, showTotal: (total) => `Total ${total} requests` }}
            scroll={{ x: 1000 }}
          />
        </Card>
      </div>
    </>
  );
};
export default GradingPage;