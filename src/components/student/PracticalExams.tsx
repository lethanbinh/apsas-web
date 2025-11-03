"use client";

import React, { useState } from "react"; // <-- ĐÃ SỬA LỖI Ở ĐÂY
import { App, Typography, Collapse } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import styles from "./AssignmentList.module.css";
import dayjs from "dayjs";
import { AssignmentData } from "./data";
import { initialExamData } from "./examData";
import { DeadlinePopover } from "./DeadlinePopover";
import { AssignmentItem } from "./AssignmentItem";

const { Title, Text } = Typography;
const { Panel } = Collapse;

export default function PracticalExams() {
  const [exams, setExams] = useState<AssignmentData[]>(initialExamData);

  const handleDeadlineSave = (id: string, newDate: dayjs.Dayjs | null) => {
    if (!newDate) return;
    setExams((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, date: newDate.toISOString() } : item
      )
    );
  };

  return (
    <div className={styles.wrapper}>
      <Title
        level={2}
        style={{
          fontWeight: 700,
          color: "#2F327D",
          marginBottom: "20px",
        }}
      >
        Practical Exams
      </Title>
      <Collapse
        accordion
        bordered={false}
        className={styles.collapse}
        defaultActiveKey={["exam1"]}
      >
        {exams.map((item) => (
          <Panel
            key={item.id}
            header={
              <div className={styles.panelHeader}>
                <div>
                  <Text
                    type="secondary"
                    style={{ fontSize: "0.9rem", color: "#E86A92" }}
                  >
                    <LinkOutlined /> {item.status}
                  </Text>
                  <Title level={4} style={{ margin: "4px 0 0 0" }}>
                    {item.title}
                  </Title>
                </div>
                <DeadlinePopover
                  id={item.id}
                  date={item.date}
                  onSave={handleDeadlineSave}
                />
              </div>
            }
          >
            <AssignmentItem data={item} />
          </Panel>
        ))}
      </Collapse>
    </div>
  );
}
