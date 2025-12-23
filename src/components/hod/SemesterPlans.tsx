"use client";
import { adminService } from "@/services/adminService";
import { Semester } from "@/types";
import { PlusOutlined } from "@ant-design/icons";
import type { TabsProps } from "antd";
import { Alert, Col, Row, Spin, Tabs, Typography } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { CreatePlanModal } from "./CreatePlanModal";
import { PlanCard } from "./PlanCard";
import { QueryParamsHandler } from "../common/QueryParamsHandler";
import styles from "./SemesterPlans.module.css";
const { Title, Text } = Typography;
const sortSemesters = (semesters: Semester[]): Semester[] => {
  const seasonOrder: { [key: string]: number } = {
    spring: 1,
    summer: 2,
    fall: 3,
  };
  return [...semesters].sort((a, b) => {
    if (b.academicYear !== a.academicYear) {
      return b.academicYear - a.academicYear;
    }
    const aSeason = a.semesterCode
      .replace(a.academicYear.toString(), "")
      .toLowerCase();
    const bSeason = b.semesterCode
      .replace(b.academicYear.toString(), "")
      .toLowerCase();
    const aOrder = seasonOrder[aSeason] || 999;
    const bOrder = seasonOrder[bSeason] || 999;
    return aOrder - bOrder;
  });
};
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
      <div
        style={{ display: "flex", justifyContent: "center", padding: "50px" }}
      >
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
    fetchSemesters();
  };
  const { ongoingSemesters, endedSemesters, upcomingSemesters } =
    useMemo(() => {
      const now = new Date();
      return {
        ongoingSemesters: sortSemesters(
          semesters.filter(
            (sem) =>
              new Date(sem.startDate) <= now && new Date(sem.endDate) >= now
          )
        ),
        endedSemesters: sortSemesters(
          semesters.filter((sem) => new Date(sem.endDate) < now)
        ),
        upcomingSemesters: sortSemesters(
          semesters.filter((sem) => new Date(sem.startDate) > now)
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
    <>
      <QueryParamsHandler />
      <div>
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
      </div>
    </>
  );
}