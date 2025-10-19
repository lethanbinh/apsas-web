// Tên file: components/AssignmentList/DeadlinePopover.tsx
"use client";

import React, { useState } from "react";
import { Popover, DatePicker, Space, Tag } from "antd";
import type { DatePickerProps } from "antd";
import { Button } from "../ui/Button";
import { CalendarOutlined } from "@ant-design/icons";
import styles from "./AssignmentList.module.css";
import dayjs from "dayjs";

interface DeadlinePopoverProps {
  id: string;
  date: string;
  onSave: (id: string, newDate: dayjs.Dayjs | null) => void;
}

export const DeadlinePopover: React.FC<DeadlinePopoverProps> = ({
  id,
  date,
  onSave,
}) => {
  const [open, setOpen] = useState(false);
  const [tempDeadline, setTempDeadline] = useState<dayjs.Dayjs | null>(
    dayjs(date)
  );

  const handleSave = () => {
    onSave(id, tempDeadline);
    setOpen(false);
  };

  const handleOpenChange = (visible: boolean) => {
    if (visible) {
      setTempDeadline(dayjs(date));
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
      title="Change Deadline"
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
    >
      <Tag
        icon={<CalendarOutlined />}
        color="default"
        className={styles.deadlineTag}
      >
        {dayjs(date).format("DD MMM YYYY, HH:mm")}
      </Tag>
    </Popover>
  );
};
