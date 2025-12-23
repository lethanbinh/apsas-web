import { Tag, Typography } from "antd";
import type { RubricItem } from "@/services/rubricItemService";
import type { QuestionWithRubrics } from "../page";
const { Text } = Typography;
export function getQuestionColumns(question: QuestionWithRubrics) {
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
      render: (text: string) => (
        <Text code style={{ fontSize: "12px" }}>
          {text || "N/A"}
        </Text>
      ),
    },
    {
      title: "Output",
      dataIndex: "output",
      key: "output",
      width: "15%",
      render: (text: string) => (
        <Text code style={{ fontSize: "12px" }}>
          {text || "N/A"}
        </Text>
      ),
    },
    {
      title: "Max Score",
      dataIndex: "score",
      key: "maxScore",
      width: "10%",
      align: "center" as const,
      render: (score: number) => <Tag color="blue">{score}</Tag>,
    },
    {
      title: "Score",
      key: "rubricScore",
      width: "25%",
      render: (_: any, record: RubricItem) => {
        const currentScore = question.rubricScores[record.id] || 0;
        return (
          <Text strong style={{ fontSize: "16px", color: currentScore > 0 ? "#52c41a" : "#999" }}>
            {currentScore.toFixed(2)}
          </Text>
        );
      },
    },
  ];
}