"use client";

import { Col, Row, Typography } from "antd";

import { CourseCard, CourseCardProps } from "../classes/CourseCard";
import styles from "./CourseGrid.module.css";

const { Title } = Typography;

export default function CourseGrid({
  courses,
  currentLecturerId,
}: {
  courses: CourseCardProps[];
  currentLecturerId: string | null;
}) {
  return (
    <div className={styles.sectionWrapper}>
      {courses.length === 0 ? (
        <Title level={4} style={{ textAlign: "center", color: "#888" }}>
          No courses found.
        </Title>
      ) : (
        <Row gutter={[50, 50]} justify="center">
          {courses.map((course) => (
            <Col key={course.id} xs={24} md={12} lg={8}>
              <CourseCard
                id={course.id}
                title={course.title}
                authorAvatarUrl={course.authorAvatarUrl}
                authorName={course.authorName}
                description={course.description}
                imageUrl={course.imageUrl}
                lecturerId={course.lecturerId}
                currentLecturerId={currentLecturerId}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}