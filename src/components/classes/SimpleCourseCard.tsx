"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link"; // <-- 1. Import Link
import { Avatar, Typography } from "antd";
import styles from "./MyCoursesGrid.module.css";

const { Title, Text } = Typography;

export interface SimpleCourseCardProps {
  imageUrl: string;
  title: string;
  authorAvatarUrl: string;
  authorName: string;
  href?: string;
  id?: number;
}

export const SimpleCourseCard: React.FC<SimpleCourseCardProps> = ({
  imageUrl,
  title,
  authorAvatarUrl,
  authorName,
  href,
  id,
}) => {
  // Tách nội dung card ra một biến
  const cardContent = (
    <div className={styles.courseCard}>
      <div className={styles.paddedImageWrapper}>
        <div className={styles.imageWrapper}>
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
            color: "#333",
            fontSize: "1.1rem",
          }}
          ellipsis={{ rows: 1 }}
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
      </div>
    </div>
  );

  // 4. Nếu có href, bọc nội dung card bằng Link.
  // Nếu không, trả về nội dung card như cũ.
  if (href) {
    return <Link href={href}>{cardContent}</Link>;
  }

  return cardContent;
};
