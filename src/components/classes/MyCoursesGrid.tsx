// Tên file: components/MyCoursesGrid/index.tsx
"use client";

import React from "react";
import { Row, Col, Typography } from "antd";
import { SimpleCourseCard } from "./SimpleCourseCard"; // Import card mới
import styles from "./MyCoursesGrid.module.css";

const { Title } = Typography;

// Dữ liệu mẫu
const myCoursesData = [
  {
    id: 1,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
  },
  {
    id: 2,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
  },
  {
    id: 3,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
  },
  {
    id: 4,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
  },
  {
    id: 5,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
  },
  {
    id: 6,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
  },
];

export default function MyCoursesGrid() {
  return (
    <div className={styles.sectionWrapper}>
      <Title
        level={3}
        style={{
          fontWeight: 700,
          color: "#2F327D",
          marginBottom: "30px",
          fontSize: "2rem",
        }}
      >
        Welcome Anle!
      </Title>

      <Row gutter={[32, 32]} justify="start">
        {myCoursesData.map((course) => (
          // xs={24} (1 cột mobile), md={12} (2 cột desktop)
          <Col key={course.id} xs={24} md={8}>
            <SimpleCourseCard
              title={course.title}
              authorAvatarUrl={course.authorAvatarUrl}
              authorName={course.authorName}
              imageUrl={course.imageUrl}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
}
