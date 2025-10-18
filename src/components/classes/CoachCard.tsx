"use client";

import React from "react";
import Image from "next/image";
import { Typography } from "antd";
import { AppstoreOutlined } from "@ant-design/icons"; // Icon lưới
import styles from "./CoachesSlider.module.css";

const { Title, Text } = Typography;

// Định nghĩa props
export interface CoachCardProps {
  imageUrl: string;
  category: string;
  name: string;
}

export const CoachCard: React.FC<CoachCardProps> = ({
  imageUrl,
  category,
  name,
}) => {
  return (
    <div className={styles.coachCard}>
      <div className={styles.paddedImageWrapper}>
        <div className={styles.imageWrapper}>
          <Image
            src={imageUrl}
            alt={name}
            layout="fill"
            className={styles.cardImage}
          />
        </div>
      </div>

      <div className={styles.cardContent}>
        <div className={styles.categoryInfo}>
          <AppstoreOutlined
            style={{
              color: "#A0A0A0",
              fontSize: "1rem",
              marginRight: "8px",
            }}
          />
          <Text type="secondary" style={{ fontSize: "0.9rem" }}>
            {category}
          </Text>
        </div>

        <Title
          level={5}
          style={{
            fontWeight: 700,
            color: "#333",
            fontSize: "1.1rem",
            margin: 0, // Bỏ margin mặc định của Title
          }}
        >
          {name}
        </Title>
      </div>
    </div>
  );
};