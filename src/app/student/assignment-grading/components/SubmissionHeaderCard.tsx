import { Button, Card, Descriptions, Space, Typography } from "antd";
import { ArrowLeftOutlined, EyeOutlined } from "@ant-design/icons";
import type { Submission } from "@/services/submissionService";
import type { QuestionWithRubrics } from "../page";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import styles from "../page.module.css";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Text } = Typography;

const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

interface SubmissionHeaderCardProps {
  submission: Submission;
  totalScore: number;
  questions: QuestionWithRubrics[];
  onBack: () => void;
  onViewExam: () => void;
}

export function SubmissionHeaderCard({
  submission,
  totalScore,
  questions,
  onBack,
  onViewExam,
}: SubmissionHeaderCardProps) {
  const maxScore = questions.reduce((sum, q) => {
    return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
  }, 0);

  return (
    <Card className={styles.headerCard}>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div className={styles.headerActions}>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            Back
          </Button>
          <Space>
            <Button icon={<EyeOutlined />} onClick={onViewExam}>
              View Exam
            </Button>
          </Space>
        </div>

        <Descriptions bordered column={2}>
          <Descriptions.Item label="Submission ID">{submission.id}</Descriptions.Item>
          <Descriptions.Item label="Student Code">{submission.studentCode}</Descriptions.Item>
          <Descriptions.Item label="Student Name">{submission.studentName}</Descriptions.Item>
          <Descriptions.Item label="Submitted At">
            {submission.submittedAt
              ? toVietnamTime(submission.submittedAt).format("DD/MM/YYYY HH:mm:ss")
              : "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Submission File">
            {submission.submissionFile?.name || "N/A"}
          </Descriptions.Item>
          <Descriptions.Item label="Total Score">
            <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
              {totalScore.toFixed(2)}/{maxScore.toFixed(2)}
            </Text>
          </Descriptions.Item>
        </Descriptions>
      </Space>
    </Card>
  );
}

