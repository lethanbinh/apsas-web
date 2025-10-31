"use client";

import React from "react";
import Image from "next/image";
import { Avatar, Typography, Descriptions, Divider } from "antd";
import {
  ReadOutlined,
  CalendarOutlined,
  TeamOutlined,
  UserOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import styles from "./ClassInfo.module.css";
import { ClassInfo as ClassInfoType } from "@/services/classService";

const { Title, Paragraph, Text } = Typography;

export default function ClassInfo({ classData }: { classData: ClassInfoType }) {
  return (
    <div className={styles.pageWrapper}>
      {/* 1. Ảnh Banner */}
      <div className={styles.imageWrapper}>
        <Image
          src="/classes/class-info.png"
          alt="Class Banner"
          width={1200}
          height={400}
          className={styles.image}
        />
      </div>

      {/* 2. Nội dung */}
      <div className={styles.contentWrapper}>
        {/* Tiêu đề chính */}
        <Title
          level={2}
          style={{
            fontWeight: 700,
            color: "#2F327D",
            marginBottom: "20px",
            fontSize: "2.2rem",
          }}
        >
          {classData.courseName} ({classData.classCode})
        </Title>

        {/* 6. Phần chi tiết (Đã sửa lỗi 'icon') */}
        <Descriptions
          bordered
          column={{ xs: 1, sm: 2 }}
          className={styles.descriptions}
        >
          <Descriptions.Item
            // SỬA Ở ĐÂY: Đặt icon bên trong label
            label={
              <span>
                <ReadOutlined style={{ marginRight: 8 }} />
                Course Code
              </span>
            }
            span={1}
          >
            {classData.courseCode}
          </Descriptions.Item>
          <Descriptions.Item
            // SỬA Ở ĐÂY: Đặt icon bên trong label
            label={
              <span>
                <CalendarOutlined style={{ marginRight: 8 }} />
                Semester
              </span>
            }
            span={1}
          >
            {classData.semesterName}
          </Descriptions.Item>
          <Descriptions.Item
            // SỬA Ở ĐÂY: Đặt icon bên trong label
            label={
              <span>
                <InfoCircleOutlined style={{ marginRight: 8 }} />
                Class Code
              </span>
            }
            span={1}
          >
            {classData.classCode}
          </Descriptions.Item>
          <Descriptions.Item
            // SỬA Ở ĐÂY: Đặt icon bên trong label
            label={
              <span>
                <TeamOutlined style={{ marginRight: 8 }} />
                Total Students
              </span>
            }
            span={1}
          >
            {classData.studentCount}
          </Descriptions.Item>
        </Descriptions>

        {/* 7. Phần mô tả */}
        <Title level={4} style={{ marginTop: "30px" }}>
          Class Description
        </Title>
        <Paragraph
          style={{
            fontSize: "1.1rem",
            lineHeight: 1.7,
            color: "#555",
            marginBottom: "30px",
          }}
        >
          {classData.description}
        </Paragraph>

        <Divider />

        {/* 8. Tác giả (Giảng viên) */}
        <div className={styles.authorBox}>
          <Avatar
            src="/classes/avatar-teacher.png"
            size={50}
            style={{ marginRight: "15px" }}
            icon={<UserOutlined />}
          />
          <div>
            <Text type="secondary" style={{ fontSize: "0.9rem" }}>
              Lecturer
            </Text>
            <Text
              style={{
                display: "block",
                fontWeight: 600,
                fontSize: "1.1rem",
                color: "#333",
              }}
            >
              {classData.lecturerName}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
