"use client";
import React, { memo } from "react";
import Image from "next/image";
import { Typography } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import styles from "./CoachesSlider.module.css";
const { Title, Text } = Typography;
export interface CoachCardProps {
  imageUrl: string;
  category: string;
  name: string;
}
const CoachCardComponent: React.FC<CoachCardProps> = ({
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
            fill
            className={styles.cardImage}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
            margin: 0,
          }}
        >
          {name}
        </Title>
      </div>
    </div>
  );
};
CoachCardComponent.displayName = 'CoachCard';
export const CoachCard = memo(CoachCardComponent);