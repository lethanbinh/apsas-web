"use client";

import React, { useState } from "react";
// 1. Import 'App', 'message', 'Alert'
import { App, Collapse, Typography, Tag, Input, Space, message, Alert } from "antd"; 
import type { CollapseProps } from "antd";
import { Button } from "../ui/Button";
import { ApprovalItem } from "./ApprovalItem";
import styles from "./ApprovalDetail.module.css";
// Import các types và service cần thiết
import { ApiAssessmentTemplate, ApiApprovalItem, ApiAssignRequestUpdatePayload } from "@/types"; 
import { adminService } from "@/services/adminService";
import { useRouter } from "next/navigation"; 

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

interface ApprovalDetailProps {
  template: ApiAssessmentTemplate;
  approvalItem: ApiApprovalItem; 
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


export default function ApprovalDetail({ template, approvalItem }: ApprovalDetailProps) {
  const router = useRouter();
  // 2. Lấy 'antMessage' từ hook 'App.useApp()'
  const { message: antMessage } = App.useApp(); 

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(approvalItem.status);
  
  const [rejectReasonVisibleForItem, setRejectReasonVisibleForItem] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [outerActiveKeys, setOuterActiveKeys] = useState<string | string[]>(
    template.papers.length > 0 ? [`paper-${template.papers[0].id}`] : []
  );

  // Hàm helper để tạo payload
  const createPayload = (status: number, message: string): ApiAssignRequestUpdatePayload => {
    return {
      message: message,
      courseElementId: approvalItem.courseElementId,
      assignedLecturerId: approvalItem.assignedLecturerId,
      assignedByHODId: approvalItem.assignedByHODId,
      status: status,
      assignedAt: approvalItem.assignedAt, 
    };
  };

  // Xử lý Approve
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const payload = createPayload(5, "Approved by HOD");
      await adminService.updateAssignRequestStatus(approvalItem.id, payload);
      
      setCurrentStatus(5); 
      setRejectReasonVisibleForItem(null); 
    }  finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý Reject
  const handleRejectClick = async () => {
    if (rejectReasonVisibleForItem === null) {
      setRejectReasonVisibleForItem(`paper-${template.papers[0].id}`); 
      return;
    }

    if (!rejectReason.trim()) {
      antMessage.error("Please enter a reject reason.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = createPayload(3, rejectReason);
      await adminService.updateAssignRequestStatus(approvalItem.id, payload);

      setCurrentStatus(3); 
    }  finally {
      setIsSubmitting(false);
    }
  };
  
  const isActionDisabled = isSubmitting || currentStatus === 3 || currentStatus === 5;
  const statusInfo = getStatusProps(currentStatus); 

  const paper = template.papers[0];
  if (!paper) {
    return <Alert message="Error" description="This template has no papers." type="error" showIcon />;
  }
  const paperKey = `paper-${paper.id}`;

  const courseCollapseItems: CollapseProps['items'] = [{
    key: paperKey, 
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
          {rejectReasonVisibleForItem === paperKey && (
            <TextArea
              rows={3}
              placeholder="Enter reject reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className={styles.rejectReasonInput}
              disabled={isActionDisabled}
            />
          )}
          <Space className={styles.actionButtons}>
            <Button
              variant="primary"
              size="large"
              className={styles.approveButton}
              onClick={handleApprove}
              loading={isSubmitting}
              disabled={isActionDisabled}
            >
              {currentStatus === 5 ? "Approved" : "Approve"}
            </Button>
            <Button
              variant="danger"
              size="large"
              className={styles.rejectButton}
              onClick={handleRejectClick}
              loading={isSubmitting}
              disabled={isActionDisabled}
            >
              {currentStatus === 3 ? "Rejected" : (rejectReasonVisibleForItem === paperKey ? "Confirm Reject" : "Reject")}
            </Button>
          </Space>
        </div>
      </>
    ),
    className: styles.mainPanel,
  }];

  return (
    // 3. Bọc mọi thứ trong <App>
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