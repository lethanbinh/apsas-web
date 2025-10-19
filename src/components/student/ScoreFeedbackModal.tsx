// Tên file: components/AssignmentList/ScoreFeedbackModal.tsx
"use client";

import React from "react";
import { Modal, Typography, Card, Image as AntImage } from "antd";
import { Button } from "../ui/Button";
import styles from "./AssignmentList.module.css";
import { AssignmentData } from "./data";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Paragraph, Text } = Typography;

interface ScoreFeedbackModalProps {
  open: boolean;
  onCancel: () => void;
  data: AssignmentData;
}

export const ScoreFeedbackModal: React.FC<ScoreFeedbackModalProps> = ({
  open,
  onCancel,
  data,
}) => {
  return (
    <Modal
      title={
        <Title level={4} style={{ margin: 0 }}>
          Assignment Score & Feedback
        </Title>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <Button variant="primary" onClick={onCancel}>
          Close
        </Button>
      }
      width={800}
      className={styles.scoreFeedbackModal}
    >
      <div className={styles.scoreModalBody}>
        <div className={styles.scoreSummary}>
          <Card className={styles.scoreCard}>
            <Text type="secondary">Total score</Text>
            <Title level={3} style={{ margin: "5px 0 0 0" }}>
              {data.totalScore}
            </Title>
          </Card>
          <Card className={styles.feedbackCard}>
            <Text type="secondary">Overall Feedback</Text>
            <Paragraph style={{ margin: "5px 0 0 0" }}>
              {data.overallFeedback}
            </Paragraph>
          </Card>
        </div>

        <Title
          level={4}
          style={{ fontWeight: 700, marginTop: "30px", marginBottom: "20px" }}
        >
          Detail Result
        </Title>
        {data.gradeCriteria.map((criterion) => (
          <div key={criterion.id} className={styles.criteriaRow}>
            <Card className={styles.criteriaScoreCard}>
              <Text type="secondary">{criterion.name}</Text>
              <Title level={5} style={{ margin: "5px 0 0 0" }}>
                {criterion.score}
              </Title>
            </Card>
            <Card className={styles.criteriaReasonCard}>
              <Text type="secondary">Reason for this score</Text>
              <Paragraph style={{ margin: "5px 0 0 0" }}>
                {criterion.reason}
              </Paragraph>
            </Card>
          </div>
        ))}

        <Title
          level={4}
          style={{ fontWeight: 700, marginTop: "30px", marginBottom: "20px" }}
        >
          Suggestions
        </Title>
        <div className={styles.suggestionsRow}>
          <Card className={styles.suggestionCard}>
            <Text type="secondary">What you should avoid</Text>
            <Paragraph style={{ margin: "5px 0 0 0" }}>
              {data.suggestionsAvoid}
            </Paragraph>
          </Card>
          <Card className={styles.suggestionCard}>
            <Text type="secondary">What you should improve</Text>
            <Paragraph style={{ margin: "5px 0 0 0" }}>
              {data.suggestionsImprove}
            </Paragraph>
          </Card>
        </div>

        <Title
          level={4}
          style={{ fontWeight: 700, marginTop: "30px", marginBottom: "20px" }}
        >
          My Submissions
        </Title>
        <div className={styles.submissionsGrid}>
          {data.submissions.length > 0 ? (
            data.submissions.map((submission) => (
              <Card
                key={submission.id}
                hoverable
                className={styles.submissionCard}
              >
                <div className={styles.submissionThumbnail}>
                  <AntImage
                    src={submission.thumbnailUrl}
                    alt={submission.fileName}
                    preview={false}
                  />
                </div>
                <div className={styles.submissionInfo}>
                  <Text strong>{submission.fileName}</Text>
                  <Text
                    type="secondary"
                    style={{ fontSize: "0.85rem", marginLeft: 20 }}
                  >
                    {dayjs(submission.submissionTime).format(
                      "DD MMM YY, HH:mm"
                    )}
                  </Text>
                </div>
                <Button
                  className={styles.downloadSubmissionButton}
                  icon={<DownloadOutlined />}
                  size="small"
                >
                  {""}
                </Button>
              </Card>
            ))
          ) : (
            <Text type="secondary">No submissions yet.</Text>
          )}
        </div>
      </div>
    </Modal>
  );
};
