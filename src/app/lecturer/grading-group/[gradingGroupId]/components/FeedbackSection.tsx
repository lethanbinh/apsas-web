"use client";
import { FeedbackData } from "@/services/geminiService";
import { Button, Card, Collapse, Space, Spin, Typography } from "antd";
import { SaveOutlined, RobotOutlined } from "@ant-design/icons";
import { FeedbackFields } from "./FeedbackFields";
const { Text } = Typography;
interface FeedbackSectionProps {
  feedback: FeedbackData;
  loading: boolean;
  loadingAiFeedback: boolean;
  onFeedbackChange: (field: keyof FeedbackData, value: string) => void;
  onSaveFeedback: () => void;
  onGetAiFeedback?: () => void;
  isPublished?: boolean;
}
export function FeedbackSection({
  feedback,
  loading,
  loadingAiFeedback,
  onFeedbackChange,
  onSaveFeedback,
  onGetAiFeedback,
  isPublished = false,
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
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", fontSize: '18px', fontWeight: 600 }}>
                Detailed Feedback
              </h3>
            ),
            children: (
              <Spin spinning={loading || loadingAiFeedback}>
                <div>
                  <Space direction="horizontal" style={{ width: "100%", marginBottom: 16, justifyContent: "space-between" }}>
                    <Text type="secondary" style={{ display: "block" }}>
                      Provide comprehensive feedback for the student's submission
                    </Text>
                    <Space>
                      {onGetAiFeedback && (
                        <Button
                          type="default"
                          icon={<RobotOutlined />}
                          onClick={onGetAiFeedback}
                          disabled={loading || loadingAiFeedback || isPublished}
                          loading={loadingAiFeedback}
                        >
                          Get AI Feedback
                        </Button>
                      )}
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={onSaveFeedback}
                        disabled={loading || loadingAiFeedback || isPublished}
                      >
                        Save Feedback
                      </Button>
                    </Space>
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