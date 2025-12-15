import { QuestionWithRubrics } from "@/app/student/assignment-grading/page";
import { HistoryOutlined, RobotOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Divider, Row, Space, Tag, Typography } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { QuestionsGradingSection } from "./QuestionsGradingSection";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;

const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

interface GradingDetailsSectionProps {
  questions: QuestionWithRubrics[];
  latestGradingSession: any;
  handleRubricScoreChange: (
    questionId: number,
    rubricId: number,
    score: number | null,
    maxScore: number
  ) => void;
  handleRubricCommentChange: (
    questionId: number,
    rubricId: number,
    comment: string
  ) => void;
  isSemesterPassed: boolean;
  message: MessageInstance;
  autoGradingLoading: boolean;
  saveGradeLoading: boolean;
  onAutoGrading: () => void;
  onSaveGrade: () => void;
  onOpenGradingHistory: () => void;
  onOpenFeedbackHistory: () => void;
}

export function GradingDetailsSection({
  questions,
  latestGradingSession,
  handleRubricScoreChange,
  handleRubricCommentChange,
  isSemesterPassed,
  message,
  autoGradingLoading,
  saveGradeLoading,
  onAutoGrading,
  onSaveGrade,
  onOpenGradingHistory,
  onOpenFeedbackHistory,
}: GradingDetailsSectionProps) {
  return (
    <div>
      {}
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
                icon={<RobotOutlined />}
                onClick={onAutoGrading}
                loading={autoGradingLoading}
                disabled={isSemesterPassed}
                block
              >
                Auto Grading
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={onSaveGrade}
                loading={saveGradeLoading}
                disabled={isSemesterPassed}
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
            handleRubricScoreChange={handleRubricScoreChange}
            handleRubricCommentChange={handleRubricCommentChange}
            isSemesterPassed={isSemesterPassed}
            message={message}
          />
        </Col>
      </Row>
    </div>
  );
}

