import { Submission } from "@/services/submissionService";
import { Button, Descriptions, Space, Typography } from "antd";
import { ArrowLeftOutlined, EyeOutlined, RobotOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
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
  totalMaxScore: number;
  onViewExam: () => void;
  onGetAiFeedback: () => void;
  loadingAiFeedback: boolean;
  isSemesterPassed: boolean;
}

export function SubmissionHeaderCard({
  submission,
  totalScore,
  totalMaxScore,
  onViewExam,
  onGetAiFeedback,
  loadingAiFeedback,
  isSemesterPassed,
}: SubmissionHeaderCardProps) {
  const router = useRouter();

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <div className={styles.headerActions}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
        >
          Back
        </Button>
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={onViewExam}
          >
            View Exam
          </Button>
          <Button
            icon={<RobotOutlined />}
            onClick={onGetAiFeedback}
            loading={loadingAiFeedback}
            disabled={isSemesterPassed}
          >
            Get AI Feedback
          </Button>
        </Space>
      </div>
      <Descriptions bordered column={2}>
        <Descriptions.Item label="Submission ID">{submission.id}</Descriptions.Item>
        <Descriptions.Item label="Student Code">
          {submission.studentCode}
        </Descriptions.Item>
        <Descriptions.Item label="Student Name">
          {submission.studentName}
        </Descriptions.Item>
        <Descriptions.Item label="Submitted At">
          {submission.updatedAt || submission.submittedAt
            ? toVietnamTime(submission.updatedAt || submission.submittedAt).format("DD/MM/YYYY HH:mm:ss")
            : "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Submission File">
          {submission.submissionFile?.name || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Total Score">
          <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
            {totalScore.toFixed(2)}/{totalMaxScore.toFixed(2)}
          </Text>
        </Descriptions.Item>
      </Descriptions>
    </Space>
  );
}

