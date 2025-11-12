// Tên file: components/AssignmentList/DeadlinePopover.tsx
"use client";

import React, { useState } from "react";
import { Popover, DatePicker, Space, Tag } from "antd";
import type { DatePickerProps } from "antd";
import { Button } from "../ui/Button";
import { CalendarOutlined } from "@ant-design/icons";
import styles from "./AssignmentList.module.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

interface DeadlinePopoverProps {
  id: string;
  date?: string;
  onSave: (id: string, newDate: dayjs.Dayjs | null) => void;
}

export const DeadlinePopover: React.FC<DeadlinePopoverProps> = ({
  id,
  date,
  onSave,
}) => {
  const [open, setOpen] = useState(false);
  const [tempDeadline, setTempDeadline] = useState<dayjs.Dayjs | null>(
    date ? toVietnamTime(date) : dayjs().add(7, 'days')
  );

  const handleSave = () => {
    // Convert Vietnam time back to UTC before saving
    const utcDeadline = tempDeadline ? tempDeadline.utc() : null;
    onSave(id, utcDeadline);
    setOpen(false);
  };

  const handleOpenChange = (visible: boolean) => {
    if (visible) {
      setTempDeadline(date ? toVietnamTime(date) : dayjs().add(7, 'days'));
    }
    setOpen(visible);
  };

  const onDeadlineChange: DatePickerProps["onChange"] = (date) => {
    setTempDeadline(date);
  };

  const popoverContent = (
    <Space direction="vertical">
      <DatePicker
        showTime
        format="DD/MM/YYYY HH:mm"
        value={tempDeadline}
        onChange={onDeadlineChange}
      />
      <Button
        variant="primary"
        size="small"
        onClick={handleSave}
        style={{ width: "100%" }}
      >
        Save
      </Button>
    </Space>
  );

  return (
    <Popover
      content={popoverContent}
      title={date ? "Change Deadline" : "Set Deadline"}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
    >
      <Tag
        icon={<CalendarOutlined />}
        color={date ? "default" : "blue"}
        className={styles.deadlineTag}
        style={{ cursor: "pointer" }}
      >
        {date 
          ? toVietnamTime(date).format("DD MMM YYYY, HH:mm")
          : "Click to set deadline"
        }
      </Tag>
    </Popover>
  );
};
