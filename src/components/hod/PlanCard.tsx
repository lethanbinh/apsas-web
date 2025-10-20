// Tên file: components/SemesterPlans/PlanCard.tsx
"use client";

import React from "react";
import Image from "next/image";
import { Avatar, Typography } from "antd";
import styles from "./SemesterPlans.module.css";

const { Title, Text } = Typography;

// Định nghĩa props
export interface PlanCardProps {
  imageUrl: string;
  title: string;
  authorAvatarUrl: string;
  authorName: string;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  imageUrl,
  title,
  authorAvatarUrl,
  authorName,
}) => {
  return (
    <div className={styles.planCard}>
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
};