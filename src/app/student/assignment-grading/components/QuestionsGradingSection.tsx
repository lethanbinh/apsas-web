import { Collapse, Divider, Input, Table, Tag, Typography } from "antd";
import type { RubricItem } from "@/services/rubricItemService";
import type { QuestionWithRubrics } from "../page";
import styles from "../page.module.css";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionsGradingSectionProps {
  questions: QuestionWithRubrics[];
  getQuestionColumns: (question: QuestionWithRubrics) => any[];
}

export function QuestionsGradingSection({
  questions,
  getQuestionColumns,
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
        <div className={styles.questionHeader}>
          <span>
            <strong>Question {index + 1}:</strong> {question.questionText}
          </span>
          <Tag color="blue">
            Score: {questionTotalScore.toFixed(2)}/{questionMaxScore.toFixed(2)}
          </Tag>
          <Tag color="green">Max: {questionMaxScore.toFixed(2)}</Tag>
        </div>
      ),
      children: (
        <div className={styles.questionContent}>
          {question.questionSampleInput && (
            <div className={styles.sampleSection}>
              <Text strong>Sample Input:</Text>
              <pre className={styles.codeBlock}>
                {question.questionSampleInput}
              </pre>
            </div>
          )}
          {question.questionSampleOutput && (
            <div className={styles.sampleSection}>
              <Text strong>Sample Output:</Text>
              <pre className={styles.codeBlock}>
                {question.questionSampleOutput}
              </pre>
            </div>
          )}

          <Divider />

          <Title level={5}>Grading Criteria ({question.rubrics.length})</Title>
          <Table
            columns={getQuestionColumns(question)}
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
              rows={4}
              value={question.rubricComments?.[question.id] || ""}
              readOnly
              style={{ backgroundColor: "#f5f5f5" }}
              placeholder="No comments available"
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

