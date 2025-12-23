"use client";
import React from "react";
import { Typography } from "antd";
import styles from "./CategorySlider.module.css";
const { Title, Paragraph } = Typography;
export interface CategoryCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBgColor: string;
  iconColor: string;
}
export const CategoryCard: React.FC<CategoryCardProps> = ({
  icon,
  title,
  description,
  iconBgColor,
  iconColor,
}) => {
  return (
    <div className={styles.card}>
      <div
        className={styles.iconWrapper}
        style={{
          backgroundColor: iconBgColor,
          color: iconColor,
        }}
      >
        {icon}
      </div>
      <Title level={4} className={styles.cardTitle}>
        {title}
      </Title>
      <Paragraph className={styles.cardDescription} type="secondary">
        {description}
      </Paragraph>
    </div>
  );
};