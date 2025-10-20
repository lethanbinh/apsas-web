// Tên file: components/JoinCourseSection/index.tsx
"use client";

import { Col, Input, Row, Typography } from "antd";
import { Button } from "../ui/Button"; // Import Button tùy chỉnh
import { CourseCard } from "./CourseCard";
import styles from "./JoinCourseSection.module.css";
const { Title, Text } = Typography;

// Dữ liệu mẫu cho card bên phải
const courseExample = {
  id: 1,
  title: "Class SE1720 - Mobile Programing",
  authorAvatarUrl: "/classes/avatar-teacher.png",
  authorName: "SangNM",
  description:
    "Class, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
  imageUrl: "/classes/class.png",
};

export default function JoinCourseSection() {
  return (
    <div className={styles.sectionWrapper}>
      <Row gutter={[32, 32]} align="middle" justify="center">
        {/* === CỘT BÊN TRÁI (FORM) === */}
        <Col xs={24} lg={8}>
          <div className={styles.formCard}>
            <Title
              level={3}
              style={{
                fontWeight: 700,
                color: "#2F327D",
                marginBottom: "10px",
              }}
            >
              Join Course
            </Title>

            <Text type="secondary" style={{ marginBottom: "25px" }}>
              Enter your class password to join
            </Text>

            <Input.Password
              placeholder="Class password"
              size="large"
              className={styles.passwordInput}
            />

            <Button
              variant="primary"
              size="large"
              className={styles.joinButton}
            >
              Join Class
            </Button>
          </div>
        </Col>

        <Col xs={24} lg={8}>
          <div className={styles.cardWrapper}>
            <CourseCard
              title={courseExample.title}
              authorAvatarUrl={courseExample.authorAvatarUrl}
              authorName={courseExample.authorName}
              description={courseExample.description}
              imageUrl={courseExample.imageUrl}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
}