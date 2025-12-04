"use client";

import { FeedbackData } from "@/services/geminiService";
import { Button, Card, Collapse, Col, Row, Space, Spin, Typography, Input } from "antd";
import { ReactNode } from "react";
import { SaveOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface FeedbackSectionProps {
  feedback: FeedbackData;
  loading: boolean;
  loadingAiFeedback: boolean;
  onFeedbackChange: (field: keyof FeedbackData, value: string) => void;
  onSaveFeedback: () => void;
  renderFeedbackFields: (feedbackData: FeedbackData) => ReactNode[];
}

export function FeedbackSection({
  feedback,
  loading,
  loadingAiFeedback,
  onFeedbackChange,
  onSaveFeedback,
  renderFeedbackFields,
}: FeedbackSectionProps) {
  return (
    <Card className="feedbackCard" style={{ marginTop: 24 }}>
      <Spin spinning={loading || loadingAiFeedback}>
        <Collapse
          defaultActiveKey={[]}
          className="collapse-feedback"
          items={[
            {
              key: "feedback",
              label: (
                <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center" }}>
                  Detailed Feedback
                </Title>
              ),
              children: (
                <div>
                  <Space direction="horizontal" style={{ width: "100%", marginBottom: 16, justifyContent: "space-between" }}>
                    <Text type="secondary" style={{ display: "block" }}>
                      Provide comprehensive feedback for the student's submission
                    </Text>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={onSaveFeedback}
                      disabled={loading || loadingAiFeedback}
                    >
                      Save Feedback
                    </Button>
                  </Space>
                  <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    {renderFeedbackFields(feedback)}
                  </Space>
                </div>
              ),
            },
          ]}
        />
      </Spin>
    </Card>
  );
}

