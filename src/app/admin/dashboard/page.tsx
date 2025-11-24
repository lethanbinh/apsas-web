"use client";

import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import type {
  ChartData,
  DashboardOverview,
} from "@/services/adminDashboardService";
import { adminDashboardService } from "@/services/adminDashboardService";
import {
  BookOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  FileTextOutlined,
  ReloadOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Button, Space, Spin, Tabs } from "antd";
import { useEffect, useState } from "react";
import AcademicTab from "./components/AcademicTab";
import AssessmentsTab from "./components/AssessmentsTab";
import GradingTab from "./components/GradingTab";
import OverviewTab from "./components/OverviewTab";
import SubmissionsTab from "./components/SubmissionsTab";
import UsersTab from "./components/UsersTab";
import styles from "./DashboardAdmin.module.css";

const AdminDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewData, chartDataResult] = await Promise.all([
        adminDashboardService.getDashboardOverview(),
        adminDashboardService.getChartData(),
      ]);

      setOverview(overviewData);
      setChartData(chartDataResult);
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const tabItems = [
    {
      key: "overview",
      label: (
        <Space size={8}>
          <DashboardOutlined />
          <span>Overview</span>
        </Space>
      ),
      children: (
        <OverviewTab
          overview={overview}
          chartData={chartData}
          loading={loading}
          onRefresh={handleRefresh}
        />
      ),
    },
    {
      key: "users",
      label: (
        <Space size={8}>
          <UserOutlined />
          <span>Users</span>
        </Space>
      ),
      children: (
        <UsersTab
          overview={overview}
          chartData={chartData}
          loading={loading}
          onRefresh={handleRefresh}
        />
      ),
    },
    {
      key: "academic",
      label: (
        <Space size={8}>
          <BookOutlined />
          <span>Academic</span>
        </Space>
      ),
      children: (
        <AcademicTab
          overview={overview}
          chartData={chartData}
          loading={loading}
          onRefresh={handleRefresh}
        />
      ),
    },
    {
      key: "assessments",
      label: (
        <Space size={8}>
          <FileTextOutlined />
          <span>Assessments</span>
        </Space>
      ),
      children: (
        <AssessmentsTab
          overview={overview}
          chartData={chartData}
          loading={loading}
          onRefresh={handleRefresh}
        />
      ),
    },
    {
      key: "submissions",
      label: (
        <Space size={8}>
          <UploadOutlined />
          <span>Submissions</span>
        </Space>
      ),
      children: (
        <SubmissionsTab
          overview={overview}
          chartData={chartData}
          loading={loading}
          onRefresh={handleRefresh}
        />
      ),
    },
    {
      key: "grading",
      label: (
        <Space size={8}>
          <CheckCircleOutlined />
          <span>Grading</span>
        </Space>
      ),
      children: (
        <GradingTab
          overview={overview}
          chartData={chartData}
          loading={loading}
          onRefresh={handleRefresh}
        />
      ),
    },
  ];

  if (loading && !overview) {
    return (
      <>
        <QueryParamsHandler />
        <div className={styles.container}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "60vh",
            }}
          >
            <Spin size="large" tip="Loading dashboard data..." />
          </div>
        </div>
      </>
    );
  }

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
          <h1 className={styles.title}>Admin Dashboard</h1>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>

        {error && (
          <Alert
            message="Warning"
            description={error}
            type="warning"
            showIcon
            closable
            style={{ marginBottom: "1.5rem" }}
          />
        )}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          type="line"
        />
      </div>
    </>
  );
};

export default AdminDashboardPage;
