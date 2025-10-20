"use client";

import React, { useState } from "react";
import { App, Collapse, Typography, Tag, Input, Space } from "antd";
import type { CollapseProps } from "antd";
import { Button } from "../ui/Button";
import { ApprovalItem } from "./ApprovalItem";
import styles from "./ApprovalDetail.module.css";
import { CourseApprovalData, approvalListData } from "./data"; // Adjust path if needed

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

export default function ApprovalDetail() {
  const [rejectReasonVisibleForItem, setRejectReasonVisibleForItem] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [outerActiveKeys, setOuterActiveKeys] = useState<string | string[]>(approvalListData.length > 0 ? [approvalListData[0].id] : []);

  const handleApprove = (assignmentId: string) => {
    console.log(`Approved assignment: ${assignmentId}!`);
    setRejectReasonVisibleForItem(null);
  };

  const handleRejectClick = (assignmentId: string) => {
    if (rejectReasonVisibleForItem === assignmentId) {
      console.log(`Rejected assignment ${assignmentId} with reason: ${rejectReason}`);
      // Add API call logic here
      // Maybe close the panel or update status visually after API call
      // setRejectReasonVisibleForItem(null); // Optionally hide after confirm
    } else {
      setRejectReasonVisibleForItem(assignmentId);
      setRejectReason("");
    }
  };

   const getStatusColor = (status: CourseApprovalData["status"]) => {
    switch (status) {
      case "Approved": return "success";
      case "Rejected": return "error";
      case "Pending": return "warning";
      default: return "default";
    }
  };

  const courseCollapseItems: CollapseProps['items'] = approvalListData.map((course) => ({
    key: course.id,
    label: (
      <div className={styles.mainPanelHeader}>
        <Title level={4} style={{ margin: 0 }}>
          {course.title}
        </Title>
        <Space>
          <Tag color={getStatusColor(course.status)}>{course.status}</Tag>
          <Text type="secondary">{course.assignments.length} Assignments</Text>
        </Space>
      </div>
    ),
    children: (
      <Collapse
        bordered={false}
        ghost
        className={styles.innerAssignmentCollapse}
        // defaultActiveKey={course.assignments.length > 0 ? [course.assignments[0].id] : undefined}
      >
        {course.assignments.map((assignment) => (
          <Panel
            key={assignment.id}
            header={
              <div className={styles.assignmentPanelHeader}>
                 <Title level={5} style={{ margin: 0 }}>{assignment.statusLabel}</Title>
              </div>
            }
            className={styles.assignmentPanel}
          >
            <ApprovalItem data={assignment} />

            <div className={styles.actionArea}>
              {rejectReasonVisibleForItem === assignment.id && (
                <TextArea
                  rows={3}
                  placeholder="Enter reject reason..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className={styles.rejectReasonInput}
                />
              )}
              <Space className={styles.actionButtons}>
                <Button
                  variant="primary"
                  size="large"
                  className={styles.approveButton}
                  onClick={() => handleApprove(assignment.id)}
                  disabled={rejectReasonVisibleForItem === assignment.id}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="large"
                  className={styles.rejectButton}
                  onClick={() => handleRejectClick(assignment.id)}
                  disabled={rejectReasonVisibleForItem === assignment.id && !rejectReason.trim()}
                >
                  {rejectReasonVisibleForItem === assignment.id ? "Confirm Reject" : "Reject"}
                </Button>
              </Space>
            </div>
          </Panel>
        ))}
      </Collapse>
    ),
    className: styles.mainPanel,
  }));

  return (
    <App>
      <div className={styles.wrapper}>
        <Title
          level={2}
          style={{
            fontWeight: 700,
            color: "#2F327D",
            marginBottom: "30px",
          }}
        >
          Approval Detail
        </Title>

        <Collapse
          // accordion // Use accordion if you want only ONE course open at a time
          activeKey={outerActiveKeys}
          onChange={(keys) => setOuterActiveKeys(keys)}
          bordered={false}
          className={styles.mainCollapse}
          items={courseCollapseItems}
        />
      </div>
    </App>
  );
}