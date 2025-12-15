"use client";

import { Avatar, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import styles from "./ClassInfo.module.css";

const { Text } = Typography;

interface ClassInfoAuthorProps {
  lecturerName: string;
}

export const ClassInfoAuthor = ({ lecturerName }: ClassInfoAuthorProps) => {
  return (
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
          {lecturerName}
        </Text>
      </div>
    </div>
  );
};

