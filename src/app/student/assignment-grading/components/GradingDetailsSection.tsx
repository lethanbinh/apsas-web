import { Alert, Button, Col, Divider, Row, Space, Tag, Typography } from "antd";
import { HistoryOutlined } from "@ant-design/icons";
import { QuestionsGradingSection } from "./QuestionsGradingSection";
import type { QuestionWithRubrics } from "../page";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

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
  return (
    <div>
      {/* Grading Logs Section */}
      {latestGradingSession && latestGradingSession.gradingLogs && latestGradingSession.gradingLogs.length > 0 && (
        <Alert
          message="Grading Notes"
          description={
            <div>
              {latestGradingSession.gradingLogs.map((log: any, index: number) => (
                <div key={log.id} style={{ marginBottom: index < latestGradingSession.gradingLogs.length - 1 ? 12 : 0 }}>
                  <div style={{ marginBottom: 4 }}>
                    <Tag color="blue">{log.action}</Tag>
                    <Text type="secondary" style={{ fontSize: "12px", marginLeft: 8 }}>
                      {toVietnamTime(log.timestamp).format("DD/MM/YYYY HH:mm:ss")}
                    </Text>
                  </div>
                  <Text style={{ fontSize: "13px", whiteSpace: "pre-wrap" }}>
                    {log.details}
                  </Text>
                  {index < latestGradingSession.gradingLogs.length - 1 && <Divider style={{ margin: "8px 0" }} />}
                </div>
              ))}
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
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

