import { Alert, Button, Col, Divider, Row, Space, Tag, Typography } from "antd";
import { HistoryOutlined, RobotOutlined, SaveOutlined } from "@ant-design/icons";
import { QuestionsGradingSection } from "./QuestionsGradingSection";
import type { QuestionWithRubrics } from "./QuestionsGradingSection";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { MessageInstance } from "antd/es/message/interface";
import { GradingSession } from "@/services/gradingService";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;

const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

interface GradingDetailsSectionProps {
  questions: QuestionWithRubrics[];
  latestGradingSession: GradingSession | null;
  maxScore: number;
  semesterEnded: boolean;
  autoGradingLoading: boolean;
  saving: boolean;
  onAutoGrading: () => void;
  onSave: () => void;
  onOpenGradingHistory: () => void;
  updateRubricScore: (questionId: number, rubricId: number, score: number) => void;
  updateQuestionComment: (questionId: number, comment: string) => void;
  message: MessageInstance;
}

export function GradingDetailsSection({
  questions,
  latestGradingSession,
  maxScore,
  semesterEnded,
  autoGradingLoading,
  saving,
  onAutoGrading,
  onSave,
  onOpenGradingHistory,
  updateRubricScore,
  updateQuestionComment,
  message,
}: GradingDetailsSectionProps) {
  const handleRubricScoreChange = (questionId: number, rubricId: number, score: number | null, maxScore: number) => {
    if (score === null) {
      updateRubricScore(questionId, rubricId, 0);
    } else if (score > maxScore) {
      message.error(`Score cannot exceed maximum score of ${maxScore.toFixed(2)}`);
      updateRubricScore(questionId, rubricId, maxScore);
    } else {
      updateRubricScore(questionId, rubricId, score);
    }
  };

  const handleRubricCommentChange = (questionId: number, rubricId: number, comment: string) => {
    updateQuestionComment(questionId, comment);
  };

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
              Total Max Score: {maxScore.toFixed(2)}
            </Text>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                type="default"
                icon={<RobotOutlined />}
                onClick={onAutoGrading}
                loading={autoGradingLoading}
                disabled={semesterEnded}
                block
              >
                Auto Grading
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={onSave}
                loading={saving}
                disabled={semesterEnded}
                block
              >
                Save Grade
              </Button>
              <Button
                type="default"
                icon={<HistoryOutlined />}
                onClick={onOpenGradingHistory}
                block
              >
                Grading History
              </Button>
            </Space>
          </div>
        </Col>
        <Col xs={24} md={18} lg={18}>
          <QuestionsGradingSection
            questions={questions}
            handleRubricScoreChange={handleRubricScoreChange}
            handleRubricCommentChange={handleRubricCommentChange}
            isSemesterPassed={semesterEnded}
            message={message}
          />
        </Col>
      </Row>
    </div>
  );
}

