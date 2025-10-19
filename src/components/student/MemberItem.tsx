// Tên file: components/MemberList/MemberItem.tsx
"use client";

import React from "react";
import Image from "next/image";
import { Avatar, Typography } from "antd";
import styles from "./MemberList.module.css";

const { Title, Text } = Typography;

// Định nghĩa props
export interface MemberItemProps {
  avatarUrl: string;
  flagUrl: string;
  name: string;
  details: string;
}

export const MemberItem: React.FC<MemberItemProps> = ({
  avatarUrl,
  flagUrl,
  name,
  details,
}) => {
  return (
    <div className={styles.memberItem}>
      {/* Wrapper cho Avatar và Cờ */}
      <div className={styles.avatarWrapper}>
        <Avatar src={avatarUrl} size={60} />
      </div>

      {/* Thông tin tên */}
      <div className={styles.textWrapper}>
        <Title
          level={5}
          style={{
            fontWeight: 700,
            color: "#333",
            marginBottom: "2px",
            fontSize: "1.1rem",
          }}
        >
          {name}
        </Title>
        <Text type="secondary" style={{ fontSize: "0.9rem" }}>
          {details}
        </Text>
      </div>
    </div>
  );
};
