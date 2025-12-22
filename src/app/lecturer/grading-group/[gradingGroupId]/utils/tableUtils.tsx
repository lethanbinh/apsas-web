import { InputNumber, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { RubricItem } from "@/services/rubricItemService";
import type { AssessmentQuestion } from "@/services/assessmentQuestionService";
import React from "react";

const { Text } = Typography;

interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
}

export function getQuestionColumns(
  question: QuestionWithRubrics,
  onScoreChange: (questionId: number, rubricId: number, score: number | null, maxScore: number) => void,
  isSemesterPassed: boolean,
  isGradeSheetSubmitted: boolean,
  isPublished: boolean,
  message: any
): ColumnsType<RubricItem> {
  return [
    {
      title: "Criteria",
      dataIndex: "description",
      key: "description",
      width: "25%",
    },
    {
      title: "Input",
      dataIndex: "input",
      key: "input",
      width: "15%",
      render: (_: any, record: RubricItem) => (
        <Text code style={{ fontSize: "12px" }}>
          {record.input || "N/A"}
        </Text>
      ),
    },
    {
      title: "Output",
      dataIndex: "output",
      key: "output",
      width: "15%",
      render: (_: any, record: RubricItem) => (
        <Text code style={{ fontSize: "12px" }}>
          {record.output || "N/A"}
        </Text>
      ),
    },
    {
      title: "Max Score",
      dataIndex: "score",
      key: "maxScore",
      width: "10%",
      align: "center" as const,
      render: (score: number) => <Tag color="blue">{score.toFixed(2)}</Tag>,
    },
    {
      title: "Score",
      key: "rubricScore",
      width: "25%",
      render: (_: any, record: RubricItem) => {
        const currentScore = question.rubricScores[record.id] || 0;
        return (
          <InputNumber
            min={0}
            max={record.score}
            value={currentScore}
            onChange={(value) =>
              onScoreChange(question.id, record.id, value, record.score)
            }
            onBlur={() => {
              const currentValue = question.rubricScores[record.id] || 0;
              if (currentValue > record.score) {
                message.error(`Score cannot exceed maximum score of ${record.score.toFixed(2)}`);
                onScoreChange(question.id, record.id, record.score, record.score);
              }
            }}
            style={{ width: "100%" }}
            step={0.01}
            precision={2}
            disabled={isSemesterPassed || isGradeSheetSubmitted || isPublished}
          />
        );
      },
    },
  ];
}

