import { Alert, Button, Col, Divider, Row, Space, Tag, Typography } from "antd";
import { HistoryOutlined, WarningOutlined } from "@ant-design/icons";
import { QuestionsGradingSection } from "./QuestionsGradingSection";
import type { QuestionWithRubrics } from "../page";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { GradingNotesModal } from "@/components/common/GradingNotesModal";
import { useState } from "react";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;

const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

interface GradingDetailsSectionProps {
  questions: QuestionWithRubrics[];
  latestGradingSession: any;
  getQuestionColumns: (question: QuestionWithRubrics) => any[];
  onOpenGradingHistory: () => void;
  onOpenFeedbackHistory: () => void;
}

export function GradingDetailsSection({
  questions,
  latestGradingSession,
  getQuestionColumns,
  onOpenGradingHistory,
  onOpenFeedbackHistory,
}: GradingDetailsSectionProps) {
  const [isGradingNotesModalOpen, setIsGradingNotesModalOpen] = useState(false);

  return (
    <div>
      {}
      {latestGradingSession && latestGradingSession.gradingLogs && latestGradingSession.gradingLogs.length > 0 && (
        <Alert
          message="Grading Notes"
          description={
            <Button
              type="link"
              icon={<WarningOutlined />}
              onClick={() => setIsGradingNotesModalOpen(true)}
              style={{ padding: 0, height: "auto" }}
            >
              View warning ({latestGradingSession.gradingLogs.length})
            </Button>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <GradingNotesModal
        open={isGradingNotesModalOpen}
        onClose={() => setIsGradingNotesModalOpen(false)}
        gradingLogs={latestGradingSession?.gradingLogs || []}
      />
      <Row gutter={16}>
        <Col xs={24} md={6} lg={6}>
          <div>
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
              Total Questions: {questions.length}
            </Text>
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
              Total Max Score: {questions.reduce((sum, q) => {
                return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
              }, 0).toFixed(2)}
            </Text>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                type="default"
                icon={<HistoryOutlined />}
                onClick={onOpenGradingHistory}
                block
              >
                Grading History
              </Button>
              <Button
                type="default"
                icon={<HistoryOutlined />}
                onClick={onOpenFeedbackHistory}
                block
              >
                Feedback History
              </Button>
            </Space>
          </div>
        </Col>
        <Col xs={24} md={18} lg={18}>
          <QuestionsGradingSection
            questions={questions}
            getQuestionColumns={getQuestionColumns}
          />
        </Col>
      </Row>
    </div>
  );
}

