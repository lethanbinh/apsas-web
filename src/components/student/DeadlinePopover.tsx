// Tên file: components/AssignmentList/DeadlinePopover.tsx
"use client";

import React, { useState } from "react";
import { Popover, DatePicker, Space, Tag, Typography, Alert } from "antd";
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
  startDate?: string;
  endDate?: string;
  semesterStartDate?: string;
  semesterEndDate?: string;
  onSave: (id: string, startDate: dayjs.Dayjs | null, endDate: dayjs.Dayjs | null) => void;
}

const { Text } = Typography;

export const DeadlinePopover: React.FC<DeadlinePopoverProps> = ({
  id,
  startDate,
  endDate,
  semesterStartDate,
  semesterEndDate,
  onSave,
}) => {
  const [open, setOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<dayjs.Dayjs | null>(
    startDate ? toVietnamTime(startDate) : dayjs()
  );
  const [tempEndDate, setTempEndDate] = useState<dayjs.Dayjs | null>(
    endDate ? toVietnamTime(endDate) : dayjs().add(7, 'days')
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateDates = (start: dayjs.Dayjs | null, end: dayjs.Dayjs | null): string | null => {
    if (!start || !end) {
      return "Both start date and end date are required";
    }

    // Validate start date < end date
    if (start.isAfter(end) || start.isSame(end)) {
      return "Start date must be before end date";
    }

    // Validate with semester dates if provided
    if (semesterStartDate && semesterEndDate) {
      const semesterStart = toVietnamTime(semesterStartDate);
      const semesterEnd = toVietnamTime(semesterEndDate);

      if (start.isBefore(semesterStart)) {
        return `Start date must be on or after semester start date (${semesterStart.format("DD/MM/YYYY")})`;
      }

      if (end.isAfter(semesterEnd)) {
        return `End date must be on or before semester end date (${semesterEnd.format("DD/MM/YYYY")})`;
      }
    }

    return null;
  };

  const handleSave = () => {
    const error = validateDates(tempStartDate, tempEndDate);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    // Convert Vietnam time back to UTC before saving
    const utcStartDate = tempStartDate ? tempStartDate.utc() : null;
    const utcEndDate = tempEndDate ? tempEndDate.utc() : null;
    onSave(id, utcStartDate, utcEndDate);
    setOpen(false);
  };

  const handleOpenChange = (visible: boolean) => {
    if (visible) {
      setTempStartDate(startDate ? toVietnamTime(startDate) : dayjs());
      setTempEndDate(endDate ? toVietnamTime(endDate) : dayjs().add(7, 'days'));
      setValidationError(null);
    }
    setOpen(visible);
  };

  const onStartDateChange: DatePickerProps["onChange"] = (date) => {
    setTempStartDate(date);
    setValidationError(null);
    // Auto-update end date if it's before new start date
    if (date && tempEndDate && date.isAfter(tempEndDate)) {
      setTempEndDate(date.add(1, 'day'));
    }
  };

  const onEndDateChange: DatePickerProps["onChange"] = (date) => {
    setTempEndDate(date);
    setValidationError(null);
  };

  // Get disabled dates for DatePicker based on semester dates
  const getDisabledDate = (isStartDate: boolean) => {
    return (current: dayjs.Dayjs) => {
      if (semesterStartDate && semesterEndDate) {
        const semesterStart = toVietnamTime(semesterStartDate);
        const semesterEnd = toVietnamTime(semesterEndDate);
        
        if (isStartDate) {
          // For start date: disable dates before semester start
          return current.isBefore(semesterStart, 'day');
        } else {
          // For end date: disable dates after semester end or before start date
          if (tempStartDate && current.isBefore(tempStartDate, 'day')) {
            return true;
          }
          return current.isAfter(semesterEnd, 'day');
        }
      }
      // If no semester dates, only validate start < end
      if (!isStartDate && tempStartDate) {
        return current.isBefore(tempStartDate, 'day');
      }
      return false;
    };
  };

  const popoverContent = (
    <Space direction="vertical" style={{ width: 300 }}>
      <div>
        <Text strong style={{ display: "block", marginBottom: 8 }}>Start Date</Text>
        <DatePicker
          showTime
          format="DD/MM/YYYY HH:mm"
          value={tempStartDate}
          onChange={onStartDateChange}
          disabledDate={getDisabledDate(true)}
          style={{ width: "100%" }}
          placeholder="Select start date"
        />
      </div>
      <div>
        <Text strong style={{ display: "block", marginBottom: 8 }}>End Date</Text>
      <DatePicker
        showTime
        format="DD/MM/YYYY HH:mm"
          value={tempEndDate}
          onChange={onEndDateChange}
          disabledDate={getDisabledDate(false)}
          style={{ width: "100%" }}
          placeholder="Select end date"
        />
      </div>
      {validationError && (
        <Alert
          message={validationError}
          type="error"
          showIcon
          style={{ marginTop: 8 }}
      />
      )}
      <Button
        variant="primary"
        size="small"
        onClick={handleSave}
        style={{ width: "100%" }}
        disabled={!tempStartDate || !tempEndDate}
      >
        Save
      </Button>
    </Space>
  );

  // Check if semester has ended
  const isSemesterEnded = () => {
    if (semesterEndDate) {
      const semesterEnd = toVietnamTime(semesterEndDate);
      const now = dayjs().tz("Asia/Ho_Chi_Minh");
      return now.isAfter(semesterEnd, 'day');
    }
    return false;
  };

  const semesterEnded = isSemesterEnded();

  const displayText = () => {
    if (startDate && endDate) {
      const start = toVietnamTime(startDate);
      const end = toVietnamTime(endDate);
      return `${start.format("DD/MM/YYYY HH:mm")} - ${end.format("DD/MM/YYYY HH:mm")}`;
    }
    return "Click to set deadline";
  };

  const popoverContentWithWarning = (
    <Space direction="vertical" style={{ width: 300 }}>
      <Alert
        message="Semester Ended"
        description="Cannot edit deadline when the semester has ended."
        type="warning"
        showIcon
      />
    </Space>
  );

  return (
    <Popover
      content={semesterEnded ? popoverContentWithWarning : popoverContent}
      title={startDate && endDate ? "Change Deadline" : "Set Deadline"}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
    >
      <Tag
        icon={<CalendarOutlined />}
        color={startDate && endDate ? "default" : "blue"}
        className={styles.deadlineTag}
        style={{ 
          cursor: semesterEnded ? "not-allowed" : "pointer",
          opacity: semesterEnded ? 0.6 : 1
        }}
        onClick={(e) => {
          if (semesterEnded) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {displayText()}
        {semesterEnded && " (Ended)"}
      </Tag>
    </Popover>
  );
};
