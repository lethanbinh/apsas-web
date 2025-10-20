"use client";

import React from "react";
import Image from "next/image";
import { Avatar, Tag, Typography } from "antd";
import styles from "./ClassInfo.module.css";

const { Title, Paragraph, Text } = Typography;

// Dữ liệu mẫu
const tags = ["affordable", "Stunning", "making", "madbrawns"];

export default function ClassInfo() {
  return (
    <div className={styles.pageWrapper}>
      {/* 1. Ảnh Banner */}
      <div className={styles.imageWrapper}>
        <Image
          src="/classes/class-info.png" // <-- THAY ĐỔI ĐƯỜNG DẪN ẢNH
          alt="Class Banner"
          width={1200}
          height={400} // Điều chỉnh tỷ lệ ảnh nếu cần
          className={styles.image}
        />
      </div>

      {/* 2. Nội dung */}
      <div className={styles.contentWrapper}>
        <Title
          level={2}
          style={{
            fontWeight: 700,
            color: "#2F327D",
            marginBottom: "20px",
            fontSize: "2.2rem",
          }}
        >
          Class SE172257 - Mobile Programing
        </Title>

        <Paragraph
          style={{
            fontSize: "1.1rem",
            lineHeight: 1.7,
            color: "#555",
          }}
        >
          TOTC is a platform that allows educators to create online classes
          whereby they can store the course materials online; manage
          assignments, quizzes and exams; monitor due dates; grade results and
          provide students with feedback all in one place.
        </Paragraph>
        <Paragraph
          style={{
            fontSize: "1.1rem",
            lineHeight: 1.7,
            color: "#555",
          }}
        >
          TOTC is a platform that allows educators to create online classes
          whereby they can store the course materials online; manage
          assignments, quizzes and exams; monitor due dates; grade results and
          provide students with feedback all in one place.
        </Paragraph>
        <Paragraph
          style={{
            fontSize: "1.1rem",
            lineHeight: 1.7,
            color: "#555",
            marginBottom: "30px", // Khoảng cách trước tags
          }}
        >
          TOTC is a platform
        </Paragraph>

        {/* 3. Tags */}
        <div className={styles.tagWrapper}>
          {tags.map((tag) => (
            <Tag key={tag} className={styles.tag}>
              {tag}
            </Tag>
          ))}
        </div>

        {/* 4. Tác giả */}
        <div className={styles.authorBox}>
          <Avatar
            src="/classes/avatar-teacher.png" // <-- THAY ĐỔI ĐƯỜNG DẪN AVATAR
            size={50}
            style={{ marginRight: "15px" }}
          />
          <div>
            <Text type="secondary" style={{ fontSize: "0.9rem" }}>
              Written by
            </Text>
            <Text
              style={{
                display: "block",
                fontWeight: 600,
                fontSize: "1.1rem",
                color: "#333",
              }}
            >
              SangNM
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
