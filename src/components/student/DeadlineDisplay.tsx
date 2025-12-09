"use client";

import React from "react";
import { Tag, Space } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import styles from "./AssignmentList.module.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface DeadlineDisplayProps {
  date?: string | null; // end date
  startDate?: string | null; // start date
}

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

export const DeadlineDisplay: React.FC<DeadlineDisplayProps> = ({ date, startDate }) => {
  if (!date) {
    return (
      <Tag icon={<CalendarOutlined />} color="default" className={styles.deadlineTag}>
        No deadline set
      </Tag>
    );
  }

  try {
    const endTime = toVietnamTime(date);
    const formattedEndDate = endTime.format("DD MMM YYYY, HH:mm");
    
    // If start date exists, show both start and end date
    if (startDate) {
      try {
        const startTime = toVietnamTime(startDate);
        const formattedStartDate = startTime.format("DD MMM YYYY, HH:mm");
        return (
          <Space size="middle" wrap>
            <Tag icon={<CalendarOutlined />} color="blue" className={styles.deadlineTag}>
              Start: {formattedStartDate}
            </Tag>
            <Tag icon={<CalendarOutlined />} color="red" className={styles.deadlineTag}>
              End: {formattedEndDate}
            </Tag>
          </Space>
        );
      } catch (error) {
        console.error("Error formatting start date:", error);
        // Fallback to only end date if start date is invalid
        return (
          <Tag icon={<CalendarOutlined />} color="default" className={styles.deadlineTag}>
            End: {formattedEndDate}
          </Tag>
        );
      }
    }
    
    // Only end date (backward compatibility)
    return (
      <Tag icon={<CalendarOutlined />} color="default" className={styles.deadlineTag}>
        {formattedEndDate}
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

