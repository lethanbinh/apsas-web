// Tên file: components/AllCoursesSlider/CourseCard.tsx
"use client";

import React from "react";
import Image from "next/image";
import { Avatar, Typography } from "antd";
import { Button } from "../ui/Button";
import styles from "./AllCoursesSlider.module.css";

const { Title, Paragraph, Text } = Typography;

export interface CourseCardProps {
  imageUrl: string;
  title: string;
  authorAvatarUrl: string;
  authorName: string;
  description: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  imageUrl,
  title,
  authorAvatarUrl,
  authorName,
  description,
}) => {
  return (
    <div className={styles.courseCard}>
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
            fontSize: "1.1rem", // Giảm font-size
          }}
        >
          {title}
        </Title>

        <div className={styles.authorInfo}>
          <Avatar
            src={authorAvatarUrl}
            size="small" // Thu nhỏ Avatar
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
            fontSize: "0.9rem", // Giảm font-size
          }}
          ellipsis={{ rows: 2 }} // Chỉ 2 dòng
        >
          {description}
        </Paragraph>

        <div className={styles.cardActions}>
          <Button
            variant="ghost"
            size="small" // Thu nhỏ Button
            className={styles.viewButton}
          >
            View
          </Button>
          <Button
            variant="primary"
            size="small" // Thu nhỏ Button
            className={styles.joinButton}
          >
            Join class
          </Button>
        </div>
      </div>
    </div>
  );
};