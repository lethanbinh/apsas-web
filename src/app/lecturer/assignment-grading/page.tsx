"use client";
import { queryKeys } from "@/lib/react-query";
import { gradeItemService } from "@/services/gradeItemService";
import { gradingService } from "@/services/gradingService";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { SaveOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Collapse, Space, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FeedbackFields } from "./components/FeedbackFields";
import { FeedbackHistoryModal } from "./components/FeedbackHistoryModal";
import { GradingDetailsSection } from "./components/GradingDetailsSection";
import { GradingHistoryModal } from "./components/GradingHistoryModal";
import { SubmissionHeaderCard } from "./components/SubmissionHeaderCard";
import { ViewExamModal } from "./components/ViewExamModal";
import { useAutoGrading } from "./hooks/useAutoGrading";
import { useFeedbackOperations } from "./hooks/useFeedbackOperations";
import { useSubmissionGradingData } from "./hooks/useSubmissionGradingData";
import styles from "./page.module.css";
const { Title, Text } = Typography;
export default function AssignmentGradingPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const [viewExamModalVisible, setViewExamModalVisible] = useState(false);
  const [gradingHistoryModalVisible, setGradingHistoryModalVisible] = useState(false);
  const [feedbackHistoryModalVisible, setFeedbackHistoryModalVisible] = useState(false);
  const {
    submission,
    isLoadingSubmissions,
    latestGradingSession,
    latestGradeItems,
    questions,
    assessmentTemplateId,
    isSemesterPassed,
    isPublished,
    userEdits,
    setUserEdits,
    totalScore,
    setTotalScore,
  } = useSubmissionGradingData(submissionId);
  const {
    feedback,
    loadingFeedback,
    loadingAiFeedback,
    handleFeedbackChange,
    handleSaveFeedback,
    handleGetAiFeedback,
  } = useFeedbackOperations(submissionId);
  useEffect(() => {
    const savedSubmissionId = localStorage.getItem("selectedSubmissionId");
    if (savedSubmissionId) {
      setSubmissionId(Number(savedSubmissionId));
    } else {
      message.error("No submission selected");
      router.back();
    }
  }, []);
  const { autoGradingLoading, handleAutoGrading } = useAutoGrading(
    submission ?? undefined,
    submissionId,
    isSemesterPassed,
    message
  );
  useEffect(() => {
    if (!submission && submissionId && !isLoadingSubmissions) {
      message.error("Submission not found");
      router.back();
    }
  }, [submission, submissionId, isLoadingSubmissions, message, router]);
  useEffect(() => {
    if (submissionId) {
      localStorage.removeItem(`feedback_${submissionId}`);
    }
  }, [submissionId]);
  const handleRubricScoreChange = (
    questionId: number,
    rubricId: number,
    score: number | null,
    maxScore: number
  ) => {
    const scoreValue = score || 0;
    if (scoreValue > maxScore) {
      message.error(`Score cannot exceed maximum score of ${maxScore.toFixed(2)}`);
      return;
    }
    const editKey = `${questionId}_${rubricId}`;
    setUserEdits((prev) => ({
      ...prev,
      rubricScores: {
        ...prev.rubricScores,
        [editKey]: scoreValue,
      },
    }));
  };
  const handleRubricCommentChange = (
    questionId: number,
    rubricId: number,
    comment: string
  ) => {
    setUserEdits((prev) => ({
      ...prev,
      rubricComments: {
        ...prev.rubricComments,
        [questionId]: comment,
      },
    }));
  };
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
  const { data: gradingHistoryData, isLoading: loadingGradingHistory } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId!, pageNumber: 1, pageSize: 1000 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: submissionId!,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: gradingHistoryModalVisible && !!submissionId,
  });
  const { data: feedbackHistoryData, isLoading: loadingFeedbackHistory } = useQuery({
    queryKey: ['submissionFeedbackHistory', 'bySubmissionId', submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const list = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submissionId,
      });
      return [...list].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    },
    enabled: feedbackHistoryModalVisible && !!submissionId,
  });
  const saveGradeMutation = useMutation({
    mutationFn: async () => {
      if (!submissionId || !submission) {
        throw new Error("No submission selected");
      }
      let calculatedTotal = 0;
      questions.forEach((q) => {
        const questionTotal = Object.values(q.rubricScores).reduce(
          (sum, score) => sum + (score || 0),
          0
        );
        calculatedTotal += questionTotal;
      });
      setTotalScore(calculatedTotal);
      let gradingSessionId: number;
      if (latestGradingSession) {
        gradingSessionId = latestGradingSession.id;
      } else {
        if (!assessmentTemplateId) {
          throw new Error("Cannot find assessment template. Please contact administrator.");
        }
        await gradingService.createGrading({
          submissionId: submission.id,
          assessmentTemplateId: assessmentTemplateId,
        });
        const gradingSessionsResult = await gradingService.getGradingSessions({
          submissionId: submission.id,
          pageNumber: 1,
          pageSize: 100,
        });
        if (gradingSessionsResult.items.length > 0) {
          const sortedSessions = [...gradingSessionsResult.items].sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
          gradingSessionId = sortedSessions[0].id;
        } else {
          throw new Error("Failed to create grading session");
        }
      }
      for (const question of questions) {
        const questionComment = question.rubricComments?.[question.id] || "";
        for (const rubric of question.rubrics) {
          const score = question.rubricScores[rubric.id] || 0;
          const existingGradeItem = latestGradeItems.find(
            (item) => item.rubricItemId === rubric.id
          );
          if (existingGradeItem) {
            await gradeItemService.updateGradeItem(existingGradeItem.id, {
              score: score,
              comments: questionComment,
            });
          } else {
            await gradeItemService.createGradeItem({
              gradingSessionId: gradingSessionId,
              rubricItemId: rubric.id,
              score: score,
              comments: questionComment,
            });
          }
        }
      }
      await gradingService.updateGradingSession(gradingSessionId, {
        grade: calculatedTotal,
        status: 1,
      });
      return { gradingSessionId, calculatedTotal };
    },
    onSuccess: () => {
      message.success("Grade saved successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId!, pageNumber: 1, pageSize: 100 }) });
      queryClient.invalidateQueries({ queryKey: ['gradeItems', 'byGradingSessionId'] });
      queryClient.invalidateQueries({ queryKey: ['submissionFeedback', 'bySubmissionId', submissionId] });
    },
    onError: (err: any) => {
      console.error("Failed to save grade:", err);
      message.error(err.message || "Failed to save grade");
    },
  });
  const handleSave = async () => {
    if (!submissionId || !submission) {
      message.error("No submission selected");
      return;
    }
    if (isPublished) {
      message.warning("Cannot edit grades after they have been published.");
      return;
    }
    if (isSemesterPassed) {
      message.warning("Cannot edit grades when the semester has ended.");
      return;
    }
    for (const question of questions) {
      for (const rubric of question.rubrics) {
        const score = question.rubricScores[rubric.id] || 0;
        if (score > rubric.score) {
          message.error(`Score for "${rubric.description || rubric.id}" cannot exceed maximum score of ${rubric.score.toFixed(2)}`);
          return;
        }
      }
    }
    saveGradeMutation.mutate();
  };
  const isLoadingSubmissionData = isLoadingSubmissions && !submission && !!submissionId;
  if (isLoadingSubmissionData) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }
  if (!submission) {
    return null;
  }
  return (
    <App>
      <div className={styles.container}>
        {isPublished && (
          <Alert
            message="Grades Published"
            description="Grades have been published and cannot be edited."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        {isSemesterPassed && (
          <Alert
            message="Semester Ended"
            description="Cannot edit grades when the semester has ended."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Card className={styles.headerCard}>
          <SubmissionHeaderCard
            submission={submission}
            totalScore={totalScore}
            totalMaxScore={questions.reduce((sum, q) => {
              return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
            }, 0)}
            onViewExam={() => setViewExamModalVisible(true)}
            onGetAiFeedback={handleGetAiFeedback}
            loadingAiFeedback={loadingAiFeedback}
            isSemesterPassed={isSemesterPassed}
            isPublished={isPublished}
          />
        </Card>
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
                  <Spin spinning={loadingFeedback || loadingAiFeedback}>
                    <div style={{ minHeight: loadingFeedback || loadingAiFeedback ? 200 : 'auto' }}>
                      {!loadingFeedback && !loadingAiFeedback ? (
                        <>
                          <Space direction="horizontal" style={{ width: "100%", marginBottom: 16, justifyContent: "space-between" }}>
                            <Text type="secondary" style={{ display: "block" }}>
                              Provide comprehensive feedback for the student's submission
                            </Text>
                            <Button
                              type="primary"
                              icon={<SaveOutlined />}
                              onClick={handleSaveFeedback}
                              disabled={loadingFeedback || loadingAiFeedback || isPublished}
                            >
                              Save Feedback
                            </Button>
                          </Space>
                          <Space direction="vertical" size="large" style={{ width: "100%" }}>
                            <FeedbackFields feedbackData={feedback} onFeedbackChange={handleFeedbackChange} />
                          </Space>
                        </>
                      ) : null}
                    </div>
                  </Spin>
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
                    questions={questions}
                    latestGradingSession={latestGradingSession}
                    handleRubricScoreChange={handleRubricScoreChange}
                    handleRubricCommentChange={handleRubricCommentChange}
                    isSemesterPassed={isSemesterPassed}
                    isPublished={isPublished}
                    message={message}
                    autoGradingLoading={autoGradingLoading}
                    saveGradeLoading={saveGradeMutation.isPending}
                    onAutoGrading={handleAutoGrading}
                    onSaveGrade={handleSave}
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
          submission={submission}
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