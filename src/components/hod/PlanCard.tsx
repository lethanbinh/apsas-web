"use client";
import { UserOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import Image from "next/image";
import React from "react";
import styles from "./SemesterPlans.module.css";
import Link from "next/link";
const { Title, Text } = Typography;
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
    <Link href={`/hod/semester-plans/detail/${title}`} className={styles.planCard}>
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
            level={4}
            style={{
              fontWeight: "bold",
              color: "#2F327D",
              fontSize: "1.25rem",
              margin: 0,
              marginBottom: "8px",
            }}
            ellipsis={{ rows: 1 }}
          >
            {title}
          </Title>
          <div className={styles.authorInfo}>
            <UserOutlined
              style={{
                color: "#ff5b8a",
                fontSize: "16px",
                marginRight: "8px",
              }}
            />
            <Text
              style={{ fontWeight: 500, fontSize: "0.95rem", color: "#666" }}
            >
              {authorName}
            </Text>
          </div>
        </div>
      </div>
    </Link>
  );
};