"use client";

import React from "react";
import Image from "next/image";
import { Avatar, Typography } from "antd";
import { Button } from "../ui/Button";
import styles from "./AllCoursesSlider.module.css";
import { useRouter } from "next/navigation";

const { Title, Paragraph, Text } = Typography;

export interface CourseCardProps {
  id: string | number;
  imageUrl: string;
  title: string;
  authorAvatarUrl: string;
  authorName: string;
  description: string;
  lecturerId: string;
  currentLecturerId?: string | null;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  id,
  imageUrl,
  title,
  authorAvatarUrl,
  authorName,
  description,
  lecturerId,
  currentLecturerId,
}) => {
  const router = useRouter();
  const isMyClass = lecturerId === currentLecturerId;

  const handleCardClick = () => {
    if (!isMyClass) return;
    localStorage.setItem("selectedClassId", id ? id.toString() : "");
    router.push(`/lecturer/info/${id}`);
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isMyClass) return;
    localStorage.setItem("selectedClassId", id ? id.toString() : "");
    router.push(`/lecturer/info/${id}`);
  };

  return (
    <div
      className={styles.courseCard}
      onClick={isMyClass ? handleCardClick : undefined}
      style={{ cursor: isMyClass ? "pointer" : "default" }}
    >
      <div className={styles.paddedImageWrapper}>
        <div className={styles.cardImageWrapper}>
          <Image
            src={imageUrl}
            alt={title}
            layout="fill"
            className={styles.cardImage}
          />
        </div>
      </div>

      <div className={styles.cardContent}>
        <Title
          level={5}
          style={{
            fontWeight: "bold",
            marginBottom: "12px",
            color: "#333",
            fontSize: "1.1rem",
          }}
        >
          {title}
        </Title>

        <div className={styles.authorInfo}>
          <Avatar
            src={authorAvatarUrl}
            size="small"
            style={{ marginRight: "8px" }}
          />
          <Text style={{ fontWeight: 500, fontSize: "0.9rem" }}>
            {authorName}
          </Text>
        </div>

        <Paragraph
          type="secondary"
          style={{
            marginBottom: "15px",
            fontSize: "0.9rem",
          }}
          ellipsis={{ rows: 2 }}
        >
          {description}
        </Paragraph>

        <div className={styles.cardActions}>
          {isMyClass && (
            <Button
              variant="ghost"
              size="small"
              className={styles.viewButton}
              onClick={handleViewClick}
            >
              View
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
