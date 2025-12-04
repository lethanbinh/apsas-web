"use client";

import { FeedbackData } from "@/services/geminiService";
import { Button, Card, Collapse, Space, Spin, Typography } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { FeedbackFields } from "./FeedbackFields";

const { Title, Text } = Typography;

interface FeedbackSectionProps {
  feedback: FeedbackData;
  loading: boolean;
  loadingAiFeedback: boolean;
  onFeedbackChange: (field: keyof FeedbackData, value: string) => void;
  onSaveFeedback: () => void;
}

export function FeedbackSection({
  feedback,
  loading,
  loadingAiFeedback,
  onFeedbackChange,
  onSaveFeedback,
}: FeedbackSectionProps) {
  return (
    <Card className="feedbackCard" style={{ marginTop: 24 }}>
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
              <Spin spinning={loading || loadingAiFeedback}>
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
                    <FeedbackFields feedbackData={feedback} onFeedbackChange={onFeedbackChange} />
                  </Space>
                </div>
              </Spin>
            ),
          },
        ]}
      />
    </Card>
  );
}

