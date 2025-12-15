import { Alert, Button, Col, Divider, Row, Space, Tag } from "antd";
import { HistoryOutlined, RobotOutlined, SaveOutlined } from "@ant-design/icons";
import { QuestionsGradingSection } from "./QuestionsGradingSection";
import type { QuestionWithRubrics } from "./QuestionsGradingSection";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import type { MessageInstance } from "antd/es/message/interface";
import { GradingSession } from "@/services/gradingService";
import { useCallback } from "react";

dayjs.extend(utc);
dayjs.extend(timezone);

const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

interface GradingDetailsSectionProps {
  questions: QuestionWithRubrics[];
  latestGradingSession: GradingSession | null;
  maxScore: number;
  semesterEnded: boolean;
  isGradeSheetSubmitted: boolean;
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
  isGradeSheetSubmitted,
  autoGradingLoading,
  saving,
  onAutoGrading,
  onSave,
  onOpenGradingHistory,
  updateRubricScore,
  updateQuestionComment,
  message,
}: GradingDetailsSectionProps) {
  const handleRubricScoreChange = useCallback((questionId: number, rubricId: number, score: number | null, maxScore: number) => {
    if (score === null) {
      updateRubricScore(questionId, rubricId, 0);
    } else if (score > maxScore) {
      message.error(`Score cannot exceed maximum score of ${maxScore.toFixed(2)}`);
      updateRubricScore(questionId, rubricId, maxScore);
    } else {
      updateRubricScore(questionId, rubricId, score);
    }
  }, [updateRubricScore, message]);

  const handleRubricCommentChange = useCallback((questionId: number, rubricId: number, comment: string) => {
    updateQuestionComment(questionId, comment);
  }, [updateQuestionComment]);

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
                    <span style={{ fontSize: "12px", marginLeft: 8, color: "rgba(0, 0, 0, 0.45)" }}>
                      {toVietnamTime(log.timestamp).format("DD/MM/YYYY HH:mm:ss")}
                    </span>
                  </div>
                  <span style={{ fontSize: "13px", whiteSpace: "pre-wrap" }}>
                    {log.details}
                  </span>
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
            <span style={{ display: "block", marginBottom: 16, color: "rgba(0, 0, 0, 0.45)" }}>
              Total Questions: {questions.length}
            </span>
            <span style={{ display: "block", marginBottom: 16, color: "rgba(0, 0, 0, 0.45)" }}>
              Total Max Score: {maxScore.toFixed(2)}
            </span>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                type="default"
                icon={<RobotOutlined />}
                onClick={onAutoGrading}
                loading={autoGradingLoading}
                disabled={semesterEnded || isGradeSheetSubmitted}
                block
              >
                Auto Grading
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={onSave}
                loading={saving}
                disabled={semesterEnded || isGradeSheetSubmitted}
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
            isGradeSheetSubmitted={isGradeSheetSubmitted}
            message={message}
          />
        </Col>
      </Row>
    </div>
  );
}

