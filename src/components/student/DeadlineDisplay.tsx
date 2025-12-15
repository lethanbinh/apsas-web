"use client";

import { CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React from "react";
import { Space, Tag } from "antd";
import styles from "./AssignmentList.module.css";

dayjs.extend(utc);
dayjs.extend(timezone);

interface DeadlineDisplayProps {
  date?: string | null;
  startDate?: string | null;
}

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
        return (
          <Tag icon={<CalendarOutlined />} color="default" className={styles.deadlineTag}>
            End: {formattedEndDate}
          </Tag>
        );
      }
    }

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

