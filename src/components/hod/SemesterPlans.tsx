// Tên file: components/SemesterPlans/index.tsx
"use client";

import React, { useState } from "react"; // 1. Import useState
import { Row, Col, Typography, Tabs, App } from "antd"; // 2. Import App
import type { TabsProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Button } from "../ui/Button";
import { PlanCard } from "./PlanCard";
import styles from "./SemesterPlans.module.css";
import { CreatePlanModal } from "./CreatePlanModal"; // 3. Import Modal mới
const { Title } = Typography;
const planData = [
  {
    id: 1,
    title: "Semester Fall2025",
    author: "SangNM",
    avatar: "/classes/avatar-teacher.png",
    img: "/classes/class.png",
  },
  {
    id: 2,
    title: "Semester Fall2025",
    author: "SangNM",
    avatar: "/classes/avatar-teacher.png",
    img: "/classes/class.png",
  },
  {
    id: 3,
    title: "Semester Fall2025",
    author: "SangNM",
    avatar: "/classes/avatar-teacher.png",
    img: "/classes/class.png",
  },
  {
    id: 4,
    title: "Semester Fall2025",
    author: "SangNM",
    avatar: "/classes/avatar-teacher.png",
    img: "/classes/class.png",
  },
  {
    id: 5,
    title: "Semester Fall2025",
    author: "SangNM",
    avatar: "/classes/avatar-teacher.png",
    img: "/classes/class.png",
  },
  {
    id: 6,
    title: "Semester Fall2025",
    author: "SangNM",
    avatar: "/classes/avatar-teacher.png",
    img: "/classes/class.png",
  },
];

const PlansGrid = () => (
  <Row gutter={[32, 32]} justify="start">
    {planData.map((plan) => (
      <Col key={plan.id} xs={24} md={8}>
        <PlanCard
          title={plan.title}
          authorAvatarUrl={plan.avatar}
          authorName={plan.author}
          imageUrl={plan.img}
        />
      </Col>
    ))}
  </Row>
);

const tabItems: TabsProps["items"] = [
  { key: "1", label: "Ongoing", children: <PlansGrid /> },
  { key: "2", label: "Ended", children: <PlansGrid /> },
  { key: "3", label: "Upcoming", children: <PlansGrid /> },
  { key: "4", label: "Drafts", children: <PlansGrid /> },
];
// ... (Hết phần giữ nguyên) ...

export default function SemesterPlans() {
  // 4. Thêm state để quản lý Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreatePlan = (values: any) => {
    console.log("Creating new plan with:", values);
    // Thêm logic refresh data ở đây
  };

  return (
    // 5. Bọc toàn bộ component trong <App>
    // (Bắt buộc để <CreatePlanModal> có thể dùng `message`)
    <App>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <Title
            level={2}
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
            onClick={() => setIsModalOpen(true)} // 6. Thêm onClick
          >
            Create semester plan
          </Button>
        </div>

        <Tabs defaultActiveKey="1" items={tabItems} className={styles.tabs} />
      </div>

      {/* 7. Thêm Modal vào cuối */}
      <CreatePlanModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onCreate={handleCreatePlan}
      />
    </App>
  );
}
