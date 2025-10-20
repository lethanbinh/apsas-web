// Tên file: components/SearchBanner/CourseGrid.tsx
"use client";

import { Col, Row, Typography } from "antd";

import { CourseCard } from "../classes/CourseCard";
import styles from "./CourseGrid.module.css";

const { Title } = Typography;

// Dữ liệu mẫu
const courseData = [
  {
    id: 1,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/class.png",
    authorName: "SangNM",
    description:
      "Class, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
  {
    id: 2,
    title: "Class SE1721 - Web Programing",
    authorAvatarUrl: "/classes/class.png",
    authorName: "SangNM",
    description:
      "Another class, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
  {
    id: 3,
    title: "Class SE1722 - AI Fundamentals",
    authorAvatarUrl: "/classes/class.png",
    authorName: "SangNM",
    description:
      "Explore AI, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
  {
    id: 4,
    title: "Class SE1723 - Data Science",
    authorAvatarUrl: "/classes/class.png",
    authorName: "SangNM",
    description:
      "Data Science class, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
  {
    id: 5,
    title: "Class SE1722 - AI Fundamentals",
    authorAvatarUrl: "/classes/class.png",
    authorName: "SangNM",
    description:
      "Explore AI, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
  {
    id: 6,
    title: "Class SE1723 - Data Science",
    authorAvatarUrl: "/classes/class.png",
    authorName: "SangNM",
    description:
      "Data Science class, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
];

export default function CourseGrid() {
  return (
    <div className={styles.sectionWrapper}>
      {/* Dùng Row và Col thay vì Swiper */}
      <Row gutter={[50, 50]} justify="center">
        {courseData.map((course) => (
          <Col key={course.id} xs={24} md={12} lg={8}>
            <CourseCard
              title={course.title}
              authorAvatarUrl={course.authorAvatarUrl}
              authorName={course.authorName}
              description={course.description}
              imageUrl={course.imageUrl}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
}
