"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Row, Col, Typography, Tabs, App, Spin, Alert } from "antd";
import type { TabsProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Button } from "../ui/Button";
import { PlanCard } from "./PlanCard";
import styles from "./SemesterPlans.module.css";
import { CreatePlanModal } from "./CreatePlanModal";
import { adminService } from "@/services/adminService";
import { Semester } from "@/types";

const { Title, Text } = Typography;

interface SemesterPlanCardGridProps {
  semesters: Semester[];
  loading: boolean;
  error: string | null;
}
const SemesterPlanCardGrid: React.FC<SemesterPlanCardGridProps> = ({
  semesters,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }
  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }
  if (!semesters || semesters.length === 0) {
    return <Text type="secondary">No semester plans found.</Text>;
  }

  return (
    <Row gutter={[32, 32]} justify="start">
      {semesters.map((semester) => (
        <Col key={semester.id} xs={24} md={8}>
          <PlanCard
            title={semester.semesterCode}
            authorName={`School Year: ${semester.academicYear}`}
            authorAvatarUrl="/classes/avatar-teacher.png"
            imageUrl="/classes/class.png"
          />
        </Col>
      ))}
    </Row>
  );
};

export default function SemesterPlans() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSemesters = async () => {
    try {
      setLoading(true);
      setError(null);
      const pageNumber = 1;
      const pageSize = 1000;

      const fetchedSemesters = await adminService.getPaginatedSemesters(
        pageNumber,
        pageSize
      );
      setSemesters(fetchedSemesters);
    } catch (err: any) {
      console.error("SemesterPlans: Error fetching semesters:", err);
      setError(err.message || "Failed to load semester plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  const handleCreatePlan = (values: any) => {
    console.log("Creating new plan with:", values);
    setIsModalOpen(false);
  };

  const { ongoingSemesters, endedSemesters, upcomingSemesters } = useMemo(() => {
    const now = new Date();
    return {
      ongoingSemesters: semesters.filter(
        (sem) =>
          new Date(sem.startDate) <= now && new Date(sem.endDate) >= now
      ),
      endedSemesters: semesters.filter(
        (sem) => new Date(sem.endDate) < now
      ),
      upcomingSemesters: semesters.filter(
        (sem) => new Date(sem.startDate) > now
      ),
    };
  }, [semesters]);

  const tabItems: TabsProps["items"] = [
    {
      key: "1",
      label: "Ongoing",
      children: (
        <SemesterPlanCardGrid
          semesters={ongoingSemesters}
          loading={loading}
          error={error}
        />
      ),
    },
    {
      key: "2",
      label: "Ended",
      children: (
        <SemesterPlanCardGrid
          semesters={endedSemesters}
          loading={loading}
          error={error}
        />
      ),
    },
    {
      key: "3",
      label: "Upcoming",
      children: (
        <SemesterPlanCardGrid
          semesters={upcomingSemesters}
          loading={loading}
          error={error}
        />
      ),
    },
  ];
  return (
    <App>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <Title
            level={2}
            className={styles.pageTitle}
            style={{
              fontWeight: 700,
              color: "#2F327D",
              margin: 0,
            }}
          >
            Semester plans
          </Title>

          <Button
            variant="primary"
            size="large"
            className={styles.createButton}
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Create semester plan
          </Button>
        </div>

        <Tabs defaultActiveKey="1" items={tabItems} className={styles.tabs} />
      </div>

      <CreatePlanModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onCreate={handleCreatePlan}
      />
    </App>
  );
}