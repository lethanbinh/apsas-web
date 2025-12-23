"use client";
import React from "react";
import { Row, Col, Typography, Select } from "antd";
import { SimpleCourseCard, SimpleCourseCardProps } from "./SimpleCourseCard";
import styles from "./MyCoursesGrid.module.css";
const { Title } = Typography;
const myCoursesData = [
  {
    id: 1,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
    href: "/lecturer/info",
  },
  {
    id: 2,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
    href: "/lecturer/info",
  },
  {
    id: 3,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
    href: "/lecturer/info",
  },
  {
    id: 4,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
    href: "/lecturer/info",
  },
  {
    id: 5,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
    href: "/lecturer/info",
  },
  {
    id: 6,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    imageUrl: "/classes/class.png",
    href: "/lecturer/info",
  },
];
interface MyCoursesGridProps {
  userName?: string;
  courses?: SimpleCourseCardProps[];
  semesterOptions?: { label: string; value: string }[];
  selectedSemester?: string;
  onSemesterChange?: (value: string) => void;
}
export default function MyCoursesGrid({
  userName = "User",
  courses = myCoursesData,
  semesterOptions = [],
  selectedSemester,
  onSemesterChange,
}: MyCoursesGridProps) {
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
        Welcome {userName}!
      </Title>
      <Select
        value={selectedSemester}
        onChange={onSemesterChange}
        options={semesterOptions}
        placeholder="Filter by semester"
        style={{ width: 240, marginBottom: "30px" }}
      />
      <Row gutter={[32, 32]} justify="start">
        {courses.map((course) => (
          <Col key={course.id} xs={24} md={8}>
            <SimpleCourseCard
              title={course.title}
              authorAvatarUrl={course.authorAvatarUrl}
              authorName={course.authorName}
              imageUrl={course.imageUrl}
              id={course.id}
              href={course.href}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
}