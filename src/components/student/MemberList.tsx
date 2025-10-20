// Tên file: components/MemberList/index.tsx
"use client";

import React from "react";
import { Typography } from "antd";
import { MemberItem } from "./MemberItem"; // Import component con
import styles from "./MemberList.module.css";

const { Title } = Typography;

// Dữ liệu mẫu
const memberData = [
  {
    id: 1,
    name: "Le Thanh Binh",
    details: "K17 HCM",
    avatarUrl: "/classes/avatar1.png", // Thay bằng avatar của bạn
    flagUrl: "/flags/germany.png", // Thay bằng cờ của bạn
  },
  {
    id: 2,
    name: "Le Thanh Binh",
    details: "K17 HCM",
    avatarUrl: "/classes/avatar1.png",
    flagUrl: "/flags/germany.png",
  },
  {
    id: 3,
    name: "Le Thanh Binh",
    details: "K17 HCM",
    avatarUrl: "/classes/avatar1.png",
    flagUrl: "/flags/germany.png",
  },
];

export default function MemberList() {
  return (
    <div className={styles.sectionWrapper}>
      <Title
        level={3}
        style={{
          fontWeight: 700,
          color: "#2F327D",
          marginBottom: "30px",
          fontSize: "2rem",
        }}
      >
        Members
      </Title>

      <div className={styles.listContainer}>
        {memberData.map((member) => (
          <MemberItem
            key={member.id}
            name={member.name}
            details={member.details}
            avatarUrl={member.avatarUrl}
            flagUrl={member.flagUrl}
          />
        ))}
      </div>
    </div>
  );
}
