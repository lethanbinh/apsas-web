import { Submission } from "@/services/submissionService";
import { Descriptions, Space } from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { memo, useMemo } from "react";

dayjs.extend(utc);
dayjs.extend(timezone);

const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

interface SubmissionHeaderCardProps {
  submission: Submission;
  totalScore: number;
  maxScore: number;
}

export const SubmissionHeaderCard = memo(function SubmissionHeaderCard({
  submission,
  totalScore,
  maxScore,
}: SubmissionHeaderCardProps) {
  const scoreText = useMemo(() => `${totalScore.toFixed(2)}/${maxScore.toFixed(2)}`, [totalScore, maxScore]);
  const submittedAtText = useMemo(() => {
    return submission.updatedAt || submission.submittedAt
      ? toVietnamTime(submission.updatedAt || submission.submittedAt).format("DD/MM/YYYY HH:mm:ss")
      : "N/A";
  }, [submission.updatedAt, submission.submittedAt]);
  
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
          {submittedAtText}
        </Descriptions.Item>
        <Descriptions.Item label="Submission File">
          {submission.submissionFile?.name || "N/A"}
        </Descriptions.Item>
        <Descriptions.Item label="Total Score">
          <span style={{ fontSize: "18px", color: "#1890ff", fontWeight: 600 }}>
            {scoreText}
          </span>
        </Descriptions.Item>
      </Descriptions>
    </Space>
  );
});

