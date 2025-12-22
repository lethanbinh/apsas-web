import { AssessmentQuestion } from "@/services/assessmentQuestionService";
import { RubricItem } from "@/services/rubricItemService";
import { Collapse, Divider, Table, Tag } from "antd";
import { Input } from "antd";
import { getQuestionColumns } from "../utils/tableUtils";
import type { MessageInstance } from "antd/es/message/interface";
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
  isGradeSheetSubmitted: boolean;
  isPublished?: boolean;
  message: MessageInstance;
}

export function QuestionsGradingSection({
  questions,
  handleRubricScoreChange,
  handleRubricCommentChange,
  isSemesterPassed,
  isGradeSheetSubmitted,
  isPublished = false,
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
            <Tag color="green">Max: {questionMaxScore.toFixed(2)}</Tag>
          </div>
        </div>
      ),
      children: (
        <div>
          {question.questionSampleInput && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 600 }}>Sample Input:</span>
              <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, overflow: "auto" }}>
                {question.questionSampleInput}
              </pre>
            </div>
          )}
          {question.questionSampleOutput && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 600 }}>Sample Output:</span>
              <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, overflow: "auto" }}>
                {question.questionSampleOutput}
              </pre>
            </div>
          )}

          <Divider />

          <h5 style={{ margin: 0, marginBottom: 16, fontSize: '16px', fontWeight: 600 }}>
            Grading Criteria ({question.rubrics.length})
          </h5>
          <Table
            columns={getQuestionColumns(question, handleRubricScoreChange, isSemesterPassed, isGradeSheetSubmitted, isPublished, message)}
            dataSource={question.rubrics}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ x: "max-content" }}
          />

          <Divider />

          <div style={{ marginTop: 16 }}>
            <span style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
              Comments
            </span>
            <TextArea
              rows={15}
              value={question.rubricComments?.[question.id] || ""}
              onChange={(e) =>
                handleRubricCommentChange(question.id, question.id, e.target.value)
              }
              placeholder="Enter comments for this question..."
              style={{ width: "100%" }}
              disabled={isSemesterPassed || isGradeSheetSubmitted || isPublished}
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

