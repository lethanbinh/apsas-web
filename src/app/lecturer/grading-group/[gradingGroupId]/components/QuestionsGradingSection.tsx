import { AssessmentQuestion } from "@/services/assessmentQuestionService";
import { RubricItem } from "@/services/rubricItemService";
import { Collapse, Divider, Table, Tag, Typography } from "antd";
import { Input } from "antd";
import { getQuestionColumns } from "../utils/tableUtils";
import type { MessageInstance } from "antd/es/message/interface";

const { Title, Text } = Typography;
const { TextArea } = Input;

export interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
}

interface QuestionsGradingSectionProps {
  questions: QuestionWithRubrics[];
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
}

export function QuestionsGradingSection({
  questions,
  handleRubricScoreChange,
  handleRubricCommentChange,
  isSemesterPassed,
  message,
}: QuestionsGradingSectionProps) {
  const sortedQuestions = [...questions].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));

  const renderQuestionCollapse = (question: QuestionWithRubrics, index: number) => {
    const questionTotalScore = Object.values(question.rubricScores).reduce(
      (sum, score) => sum + (score || 0),
      0
    );
    const questionMaxScore = question.rubrics.reduce(
      (sum, r) => sum + r.score,
      0
    );

    return {
      key: `question-${index}`,
      label: (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>
            <strong>Question {index + 1}:</strong> {question.questionText}
          </span>
          <div>
            <Tag color="blue" style={{ marginRight: 8 }}>
              Score: {questionTotalScore.toFixed(2)}/{questionMaxScore.toFixed(2)}
            </Tag>
            <Tag color="green">Max: {question.score.toFixed(2)}</Tag>
          </div>
        </div>
      ),
      children: (
        <div>
          {question.questionSampleInput && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>Sample Input:</Text>
              <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, overflow: "auto" }}>
                {question.questionSampleInput}
              </pre>
            </div>
          )}
          {question.questionSampleOutput && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>Sample Output:</Text>
              <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, overflow: "auto" }}>
                {question.questionSampleOutput}
              </pre>
            </div>
          )}

          <Divider />

          <Title level={5}>Grading Criteria ({question.rubrics.length})</Title>
          <Table
            columns={getQuestionColumns(question, handleRubricScoreChange, isSemesterPassed, message)}
            dataSource={question.rubrics}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: "max-content" }}
          />

          <Divider />

          <div style={{ marginTop: 16 }}>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Comments
            </Text>
            <TextArea
              rows={15}
              value={question.rubricComments?.[question.id] || ""}
              onChange={(e) =>
                handleRubricCommentChange(question.id, question.id, e.target.value)
              }
              placeholder="Enter comments for this question..."
              style={{ width: "100%" }}
              disabled={isSemesterPassed}
            />
          </div>
        </div>
      ),
    };
  };

  return (
    <Collapse
      items={sortedQuestions.map((question, index) =>
        renderQuestionCollapse(question, index)
      )}
    />
  );
}

