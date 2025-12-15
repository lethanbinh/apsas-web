"use client";

import { queryKeys } from "@/lib/react-query";
import { FeedbackData } from "@/services/geminiService";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { App, Button, Collapse, Descriptions, Modal, Space, Spin, Tag, Typography, Input } from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

dayjs.extend(utc);
dayjs.extend(timezone);

const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

const { Title, Text } = Typography;
const { TextArea } = Input;

interface FeedbackHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  submissionId: number | null;
}

export function FeedbackHistoryModal({ visible, onClose, submissionId }: FeedbackHistoryModalProps) {

  const { data: feedbackHistoryData, isLoading: loading } = useQuery({
    queryKey: ['submissionFeedbackHistory', 'bySubmissionId', submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const list = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submissionId,
      });
      return [...list].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    },
    enabled: visible && !!submissionId,
  });

  const feedbackHistory = feedbackHistoryData || [];
  const [expandedFeedbacks, setExpandedFeedbacks] = useState<Set<number>>(new Set());


  const deserializeFeedback = (feedbackText: string): FeedbackData | null => {
    if (!feedbackText || feedbackText.trim() === "") {
      return null;
    }

    try {
      const parsed = JSON.parse(feedbackText);
      if (typeof parsed === "object" && parsed !== null) {
        return {
          overallFeedback: parsed.overallFeedback || "",
          strengths: parsed.strengths || "",
          weaknesses: parsed.weaknesses || "",
          codeQuality: parsed.codeQuality || "",
          algorithmEfficiency: parsed.algorithmEfficiency || "",
          suggestionsForImprovement: parsed.suggestionsForImprovement || "",
          bestPractices: parsed.bestPractices || "",
          errorHandling: parsed.errorHandling || "",
        };
      }
      return null;
    } catch (error) {

      return null;
    }
  };

  const handleExpandFeedback = (feedbackId: number) => {
    const newExpanded = new Set(expandedFeedbacks);
    const isCurrentlyExpanded = newExpanded.has(feedbackId);

    if (isCurrentlyExpanded) {
      newExpanded.delete(feedbackId);
    } else {
      newExpanded.add(feedbackId);
    }

    setExpandedFeedbacks(newExpanded);
  };

  const renderFeedbackFields = (feedbackData: FeedbackData) => {
    const fields: Array<{ key: keyof FeedbackData; label: string }> = [
      { key: "overallFeedback", label: "Overall Feedback" },
      { key: "strengths", label: "Strengths" },
      { key: "weaknesses", label: "Weaknesses" },
      { key: "codeQuality", label: "Code Quality" },
      { key: "algorithmEfficiency", label: "Algorithm Efficiency" },
      { key: "suggestionsForImprovement", label: "Suggestions for Improvement" },
      { key: "bestPractices", label: "Best Practices" },
      { key: "errorHandling", label: "Error Handling" },
    ];

    return fields.map((field) => {
      const value = feedbackData[field.key] || "";
      if (!value) return null;

      return (
        <div key={field.key} style={{ marginBottom: 16 }}>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            {field.label}:
          </Text>
          <TextArea
            value={value}
            readOnly
            rows={value.split("\n").length + 1}
            style={{ backgroundColor: "#f5f5f5" }}
          />
        </div>
      );
    });
  };

  return (
    <Modal
      title="Feedback History"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={1000}
    >
      <Spin spinning={loading}>
        {feedbackHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">No feedback history available</Text>
          </div>
        ) : (
          <Collapse
            items={feedbackHistory.map((feedback) => {
              const isExpanded = expandedFeedbacks.has(feedback.id);
              const parsedFeedback = deserializeFeedback(feedback.feedbackText);
              const isPlainText = parsedFeedback === null;

              return {
                key: feedback.id.toString(),
                label: (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <div>
                      <Text strong>Feedback #{feedback.id}</Text>
                      <Space style={{ marginLeft: 16 }}>
                        {isPlainText ? (
                          <Tag color="orange">Plain Text</Tag>
                        ) : (
                          <Tag color="green">Structured</Tag>
                        )}
                      </Space>
                    </div>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {toVietnamTime(feedback.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                    </Text>
                  </div>
                ),
                children: (
                  <div>
                    <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                      <Descriptions.Item label="Feedback ID">{feedback.id}</Descriptions.Item>
                      <Descriptions.Item label="Submission ID">{feedback.submissionId}</Descriptions.Item>
                      <Descriptions.Item label="Created At" span={2}>
                        {toVietnamTime(feedback.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Descriptions.Item>
                      <Descriptions.Item label="Updated At" span={2}>
                        {toVietnamTime(feedback.updatedAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Descriptions.Item>
                    </Descriptions>

                    {isPlainText ? (
                      <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                          Feedback Content:
                        </Text>
                        <TextArea
                          value={feedback.feedbackText}
                          readOnly
                          rows={feedback.feedbackText.split("\n").length + 3}
                          style={{ backgroundColor: "#f5f5f5", fontFamily: "monospace" }}
                        />
                      </div>
                    ) : (
                      <div>
                        <Title level={5} style={{ marginTop: 16, marginBottom: 16 }}>
                          Feedback Details
                        </Title>
                        {renderFeedbackFields(parsedFeedback!)}
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        )}
      </Spin>
    </Modal>
  );
}

