"use client";

import React from "react";
import { Tag } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import styles from "./AssignmentList.module.css";
import dayjs from "dayjs";

interface DeadlineDisplayProps {
  date?: string | null;
}

export const DeadlineDisplay: React.FC<DeadlineDisplayProps> = ({ date }) => {
  if (!date) {
    return (
      <Tag icon={<CalendarOutlined />} color="default" className={styles.deadlineTag}>
        No deadline set
      </Tag>
    );
  }

  try {
    const formattedDate = dayjs(date).format("DD MMM YYYY, HH:mm");
    return (
      <Tag icon={<CalendarOutlined />} color="default" className={styles.deadlineTag}>
        {formattedDate}
      </Tag>
    );
  } catch (error) {
    console.error("Error formatting deadline:", error);
    return (
      <Tag icon={<CalendarOutlined />} color="default" className={styles.deadlineTag}>
        Invalid date
      </Tag>
    );
  }
};

