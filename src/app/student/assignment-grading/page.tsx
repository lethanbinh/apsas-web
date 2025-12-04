"use client";

import { App, Card, Collapse, Space, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { ViewExamModal } from "./components/ViewExamModal";
import { GradingHistoryModal } from "./components/GradingHistoryModal";
import { FeedbackHistoryModal } from "./components/FeedbackHistoryModal";
import { FeedbackFields } from "./components/FeedbackFields";
import { GradingDetailsSection } from "./components/GradingDetailsSection";
import { SubmissionHeaderCard } from "./components/SubmissionHeaderCard";
import { getQuestionColumns } from "./utils/tableUtils";
import { useSubmissionData } from "./hooks/useSubmissionData";
import type { AssessmentQuestion } from "@/services/assessmentQuestionService";
import type { RubricItem } from "@/services/rubricItemService";

const { Title } = Typography;

export interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
}

export default function AssignmentGradingPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [viewExamModalVisible, setViewExamModalVisible] = useState(false);
  const [gradingHistoryModalVisible, setGradingHistoryModalVisible] = useState(false);
  const [feedbackHistoryModalVisible, setFeedbackHistoryModalVisible] = useState(false);

  useEffect(() => {
    // Get submissionId from localStorage
    const savedSubmissionId = localStorage.getItem("selectedSubmissionId");
    if (savedSubmissionId) {
      setSubmissionId(Number(savedSubmissionId));
    } else {
      message.error("No submission selected");
      router.back();
    }
  }, [message, router]);

  const classIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem("selectedClassId") : null;
  const {
    finalSubmission,
    questionsWithScores,
    latestGradingSession,
    totalScore,
    feedback,
    loading,
  } = useSubmissionData({
    submissionId,
    classIdFromStorage,
  });

  const handleOpenGradingHistory = () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }
    setGradingHistoryModalVisible(true);
  };

  const handleOpenFeedbackHistory = () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }
    setFeedbackHistoryModalVisible(true);
  };

  // Redirect if submission not found
  useEffect(() => {
    if (!loading && !finalSubmission && submissionId) {
      message.error("Submission not found");
      router.back();
    }
  }, [loading, finalSubmission, submissionId, message, router]);


  if (loading && !finalSubmission) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (!finalSubmission) {
    return null;
  }

  return (
    <App>
      <div className={styles.container}>
        <SubmissionHeaderCard
          submission={finalSubmission}
          totalScore={totalScore}
          questions={questionsWithScores}
          onBack={() => router.back()}
          onViewExam={() => setViewExamModalVisible(true)}
        />

        <Card className={styles.feedbackCard} style={{ marginTop: 24 }}>
          <Collapse
            defaultActiveKey={[]}
            className={`${styles.collapseWrapper} collapse-feedback`}
            items={[
              {
                key: "feedback",
                label: (
                  <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center" }}>
                    Detailed Feedback
                  </Title>
                ),
                children: (
                  <div>
                    <Space direction="vertical" size="large" style={{ width: "100%" }}>
                      <FeedbackFields feedbackData={feedback} />
                    </Space>
                  </div>
                ),
              },
            ]}
          />
        </Card>

        <Card className={styles.questionsCard} style={{ marginTop: 24 }}>
          <Collapse
            defaultActiveKey={["grading-details"]}
            className={`${styles.collapseWrapper} collapse-grading`}
            items={[
              {
                key: "grading-details",
                label: (
                  <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center" }}>
                    Grading Details
                  </Title>
                ),
                children: (
                  <GradingDetailsSection
                    questions={questionsWithScores}
                    latestGradingSession={latestGradingSession}
                    getQuestionColumns={getQuestionColumns}
                    onOpenGradingHistory={handleOpenGradingHistory}
                    onOpenFeedbackHistory={handleOpenFeedbackHistory}
                  />
                ),
              },
            ]}
          />
        </Card>

        <ViewExamModal
          visible={viewExamModalVisible}
          onClose={() => setViewExamModalVisible(false)}
          submission={finalSubmission}
        />

        <GradingHistoryModal
          visible={gradingHistoryModalVisible}
          onClose={() => setGradingHistoryModalVisible(false)}
          submissionId={submissionId}
        />

        <FeedbackHistoryModal
          visible={feedbackHistoryModalVisible}
          onClose={() => setFeedbackHistoryModalVisible(false)}
          submissionId={submissionId}
        />
      </div>
    </App>
  );
}
