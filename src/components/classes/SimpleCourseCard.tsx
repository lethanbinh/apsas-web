"use client";
import { Avatar, Typography } from "antd";
import Image from "next/image";
import React from "react";
import styles from "./MyCoursesGrid.module.css";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

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
  const handleCardClick = () => {
    if (id) {
      localStorage.setItem("selectedClassId", id.toString());
    }
    if (href) {
      router.push(href);
    } else if (id) {
      router.push(`/lecturer/info/${id}`);
    }
  };

  if (href || id) {
    return <div onClick={handleCardClick} style={{ cursor: "pointer" }}>{cardContent}</div>;
  }

  return cardContent;
};
