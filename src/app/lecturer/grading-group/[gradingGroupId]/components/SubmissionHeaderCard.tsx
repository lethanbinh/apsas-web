import { Submission } from "@/services/submissionService";
import { Descriptions, Space, Typography } from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Text } = Typography;

const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

interface SubmissionHeaderCardProps {
  submission: Submission;
  totalScore: number;
  maxScore: number;
}

export function SubmissionHeaderCard({
  submission,
  totalScore,
  maxScore,
}: SubmissionHeaderCardProps) {
  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Descriptions bordered column={2}>
        <Descriptions.Item label="Submission ID">{submission.id}</Descriptions.Item>
        <Descriptions.Item label="Student Code">
          {submission.studentCode}
        </Descriptions.Item>
        <Descriptions.Item label="Student Name">
          {submission.studentName}
        </Descriptions.Item>
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
  );
}

