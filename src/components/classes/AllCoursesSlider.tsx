"use client";
import React from "react";
import { Typography } from "antd";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { CourseCard } from "./CourseCard";
import styles from "./AllCoursesSlider.module.css";
const { Title } = Typography;
const courseData = [
  {
    id: 1,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    description:
      "Class, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
  {
    id: 2,
    title: "Class SE1721 - Web Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    description:
      "Another class, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
  {
    id: 3,
    title: "Class SE1722 - AI Fundamentals",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    description:
      "Explore AI, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
  {
    id: 4,
    title: "Class SE1720 - Mobile Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    description:
      "Class, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
  {
    id: 5,
    title: "Class SE1721 - Web Programing",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    description:
      "Another class, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
  {
    id: 6,
    title: "Class SE1722 - AI Fundamentals",
    authorAvatarUrl: "/classes/avatar-teacher.png",
    authorName: "SangNM",
    description:
      "Explore AI, launched less than a year ago by Blackboard co-founder Michael Chasen, integrates exclusively...",
    imageUrl: "/classes/class.png",
  },
];
export default function AllCoursesSlider() {
  return (
    <div className={styles.sliderSection}>
      <Title
        level={2}
        className={styles.sectionTitle}
        style={{
          fontWeight: 700,
          marginBottom: "30px",
          textAlign: "center",
          color: "#2F327D",
        }}
      >
        All <span style={{ color: "#49BBBD" }}>Courses</span>
      </Title>
      <Swiper
        modules={[Pagination, Navigation]}
        spaceBetween={30}
        pagination={{ clickable: true }}
        className={styles.swiperContainer}
        slidesPerView={3}
      >
        {courseData.map((course) => (
          <SwiperSlide key={course.id} className={styles.swiperSlide}>
            <CourseCard
              title={course.title}
              authorAvatarUrl={course.authorAvatarUrl}
              authorName={course.authorName}
              description={course.description}
              imageUrl={course.imageUrl}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}