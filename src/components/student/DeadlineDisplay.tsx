"use client";

import React from "react";
import { Tag } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import styles from "./AssignmentList.module.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface DeadlineDisplayProps {
  date?: string | null;
}

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

export const DeadlineDisplay: React.FC<DeadlineDisplayProps> = ({ date }) => {
  if (!date) {
    return (
      <Tag icon={<CalendarOutlined />} color="default" className={styles.deadlineTag}>
        No deadline set
      </Tag>
    );
  }

  try {
    const vietnamTime = toVietnamTime(date);
    const formattedDate = vietnamTime.format("DD MMM YYYY, HH:mm");
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

