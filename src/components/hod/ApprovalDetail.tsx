"use client";

import React, { useState } from "react";
import { App, Collapse, Typography, Tag, Input, Space } from "antd";
import type { CollapseProps } from "antd";
import { Button } from "../ui/Button";
import { ApprovalItem } from "./ApprovalItem";
import styles from "./ApprovalDetail.module.css";
import { ApiAssessmentTemplate } from "@/types"; 

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

interface ApprovalDetailProps {
  template: ApiAssessmentTemplate;
}

const getStatusProps = (status: number) => {
  switch (status) {
    case 1: // PENDING
      return { color: "warning", text: "Pending" };
    case 2: // ACCEPTED
      return { color: "processing", text: "Accepted" };
    case 3: // REJECTED
      return { color: "error", text: "Rejected" };
    case 4: // IN_PROGRESS
      return { color: "processing", text: "In Progress" };
    case 5: // COMPLETED (coi là Approved)
      return { color: "success", text: "Approved" };
    default:
      return { color: "default", text: `Unknown (${status})` };
  }
};


export default function ApprovalDetail({ template }: ApprovalDetailProps) {
  const [rejectReasonVisibleForItem, setRejectReasonVisibleForItem] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [outerActiveKeys, setOuterActiveKeys] = useState<string | string[]>(
    template.papers.length > 0 ? [`paper-${template.papers[0].id}`] : []
  );

  const handleApprove = (paperId: string) => {
    console.log(`Approved paper: ${paperId}!`);
    setRejectReasonVisibleForItem(null);
  };

  const handleRejectClick = (paperId: string) => {
    if (rejectReasonVisibleForItem === paperId) {
      console.log(`Rejected paper ${paperId} with reason: ${rejectReason}`);
    } else {
      setRejectReasonVisibleForItem(paperId);
      setRejectReason("");
    }
  };

  const statusInfo = getStatusProps(template.status); 

  const courseCollapseItems: CollapseProps['items'] = template.papers.map((paper) => ({
    key: `paper-${paper.id}`, 
    label: (
      <div className={styles.mainPanelHeader}>
        <Title level={4} style={{ margin: 0 }}>
          {paper.name} ({template.courseElementName})
        </Title>
        <Space>
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
          <Tag color="blue">{template.lecturerName}</Tag>
          <Text type="secondary">{paper.questionCount} Questions</Text>
        </Space>
      </div>
    ),
    children: (
      <>
        <ApprovalItem questions={paper.questions} />

        <div className={styles.actionArea}>
          {rejectReasonVisibleForItem === `paper-${paper.id}` && (
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
              onClick={() => handleApprove(`paper-${paper.id}`)}
              disabled={rejectReasonVisibleForItem === `paper-${paper.id}`}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="large"
              className={styles.rejectButton}
              onClick={() => handleRejectClick(`paper-${paper.id}`)}
              disabled={rejectReasonVisibleForItem === `paper-${paper.id}` && !rejectReason.trim()}
            >
              {rejectReasonVisibleForItem === `paper-${paper.id}` ? "Confirm Reject" : "Reject"}
            </Button>
          </Space>
        </div>
      </>
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
          Approval Detail: {template.name}
        </Title>

        <Collapse
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