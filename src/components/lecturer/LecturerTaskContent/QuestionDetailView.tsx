"use client";
import { rubricItemService } from "@/services/rubricItemService";
import { RubricItem } from "@/services/rubricItemService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { App, Button, Card, Descriptions, Input, List, Space, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { QuestionFormModal } from "./QuestionFormModal";
import { RubricFormModal } from "./RubricFormModal";
import { AssignRequestItem } from "@/services/assignRequestService";
import styles from "./TaskContent.module.css";
const { Title, Text } = Typography;
interface QuestionDetailViewProps {
  question: AssessmentQuestion;
  isEditable: boolean;
  onRubricChange: () => void;
  onQuestionChange: () => void;
  onResetStatus?: () => Promise<void>;
  task?: AssignRequestItem;
  updateStatusToInProgress?: () => Promise<void>;
}
export const QuestionDetailView = ({
  question,
  isEditable,
  onRubricChange,
  onQuestionChange,
  onResetStatus,
  task,
  updateStatusToInProgress,
}: QuestionDetailViewProps) => {
  const [rubrics, setRubrics] = useState<RubricItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedRubric, setSelectedRubric] = useState<RubricItem | undefined>(
    undefined
  );
  const { modal, notification } = App.useApp();
  const isRejected = task && Number(task.status) === 3;
  const fetchRubrics = async () => {
    setIsLoading(true);
    try {
      const response = await rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: question.id,
        pageNumber: 1,
        pageSize: 100,
      });
      setRubrics(response.items);
    } catch (error) {
      console.error("Failed to fetch rubrics:", error);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchRubrics();
  }, [question.id]);
  const openRubricModal = (rubric?: RubricItem) => {
    setSelectedRubric(rubric);
    setIsRubricModalOpen(true);
  };
  const closeRubricModal = () => {
    setIsRubricModalOpen(false);
    setSelectedRubric(undefined);
  };
  const handleRubricFinish = async () => {
    closeRubricModal();
    fetchRubrics();
    onRubricChange();
    if (updateStatusToInProgress) {
      await updateStatusToInProgress();
    }
    const hadComment = !!(question.reviewerComment && question.reviewerComment.trim());
    if (hadComment) {
      try {
        await assessmentQuestionService.updateAssessmentQuestion(question.id, {
          questionText: question.questionText,
          questionSampleInput: question.questionSampleInput,
          questionSampleOutput: question.questionSampleOutput,
          score: question.score,
          questionNumber: question.questionNumber,
          reviewerComment: undefined,
        });
        notification.success({
          message: "Rubric updated and comment resolved",
          description: "The rubric has been updated and the reviewer comment has been marked as resolved.",
        });
        onQuestionChange();
      } catch (error) {
        console.error("Failed to clear comment:", error);
      }
    }
    if (hadComment && task) {
      const storageKey = `task-${task.id}-resolved-questions`;
      try {
        const resolvedQuestions = JSON.parse(localStorage.getItem(storageKey) || '[]');
        if (!resolvedQuestions.includes(question.id)) {
          resolvedQuestions.push(question.id);
          localStorage.setItem(storageKey, JSON.stringify(resolvedQuestions));
          console.log("Saved resolved question to localStorage (via rubric edit):", question.id, "Total resolved:", resolvedQuestions.length);
        }
      } catch (err) {
        console.error("Failed to save to localStorage:", err);
      }
      if (onResetStatus) {
        console.log("Rubric edit cleared comment, will check and reset status after delay");
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log("Calling onResetStatus to check if all comments resolved");
        await onResetStatus();
      }
    }
  };
  const handleDeleteRubric = (id: number) => {
    modal.confirm({
      title: "Delete this rubric?",
      content: "This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await rubricItemService.deleteRubricItem(id);
          notification.success({ message: "Rubric deleted" });
          handleRubricFinish();
        } catch (error) {
          notification.error({ message: "Failed to delete rubric" });
        }
      },
    });
  };
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Title level={4} className={styles.cardTitle} style={{ margin: 0 }}>Question Details</Title>
          {isEditable && (
            <Button
              icon={<EditOutlined />}
              onClick={() => setIsQuestionModalOpen(true)}
              className={styles.button}
            >
              Edit Question
            </Button>
          )}
        </div>
        <div className={styles.cardBody}>
          <Descriptions bordered column={1} className={styles.descriptions}>
            <Descriptions.Item label="Question Number">
              <Text strong>{question.questionNumber || "N/A"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Question Text">
              <div className={styles.questionTextContainer}>
                <div className={styles.questionText}>
                  {question.questionText}
                </div>
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Sample Input">
              <div className={styles.questionTextContainer}>
                {question.questionSampleInput ? (
                  <div className={styles.sampleInputOutput}>
                    {question.questionSampleInput}
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontStyle: "italic" }}>No sample input provided</Text>
                )}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Sample Output">
              <div className={styles.questionTextContainer}>
                {question.questionSampleOutput ? (
                  <div className={styles.sampleInputOutput}>
                    {question.questionSampleOutput}
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontStyle: "italic" }}>No sample output provided</Text>
                )}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Score">
              <Text strong>{question.score}</Text>
            </Descriptions.Item>
            {question.reviewerComment && (
              <Descriptions.Item label="Reviewer Comment">
                <div className={styles.commentBox}>
                  <Text className={styles.commentText}>{question.reviewerComment}</Text>
                </div>
                {question.updatedAt && (
                  <div className={styles.commentMeta}>
                    <Text>
                      <Text className={styles.commentMetaLabel}>Commented on:</Text> {new Date(question.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </Text>
                  </div>
                )}
                {isRejected && (
                  <div style={{ marginTop: "12px" }}>
                    <Text type="secondary" style={{ fontSize: "12px", fontStyle: "italic", color: "#69b1ff" }}>
                      Edit the question content above to resolve this comment.
                    </Text>
                  </div>
                )}
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>
      </div>
      <div className={styles.rubricCard}>
        <div className={styles.rubricCardHeader}>
          <Title level={5} className={styles.rubricCardTitle} style={{ margin: 0 }}>Grading Rubrics</Title>
          {isEditable && (
            <Button
              icon={<PlusOutlined />}
              type="dashed"
              onClick={() => openRubricModal()}
              className={styles.button}
            >
              Add Rubric
            </Button>
          )}
        </div>
        <div className={styles.rubricCardBody}>
          {isLoading ? (
            <Spin />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={rubrics}
              className={styles.rubricList}
              renderItem={(rubric) => (
                <List.Item
                  actions={
                    isEditable
                      ? [
                        <div key="actions" className={styles.rubricActions}>
                          <Button
                            type="link"
                            onClick={() => openRubricModal(rubric)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="link"
                            danger
                            onClick={() => handleDeleteRubric(rubric.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      ]
                      : []
                  }
                >
                  <div className={styles.rubricMeta}>
                    <Text className={styles.rubricTitle}>{rubric.description}</Text>
                    <Text className={styles.rubricDescription}>
                      Input: {rubric.input || "N/A"} | Output: {rubric.output || "N/A"}
                    </Text>
                  </div>
                  <div>
                    <Text className={styles.rubricScore}>{rubric.score} points</Text>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
      </div>
      <RubricFormModal
        open={isRubricModalOpen}
        onCancel={closeRubricModal}
        onFinish={handleRubricFinish}
        isEditable={isEditable}
        initialData={selectedRubric}
        questionId={question.id}
        currentRubricsCount={rubrics.length}
      />
      <QuestionFormModal
        open={isQuestionModalOpen}
        onCancel={() => setIsQuestionModalOpen(false)}
        onFinish={async () => {
          setIsQuestionModalOpen(false);
          const hadComment = !!question.reviewerComment;
          onQuestionChange();
          if (updateStatusToInProgress) {
            await updateStatusToInProgress();
          }
          if (hadComment && task) {
            const storageKey = `task-${task.id}-resolved-questions`;
            try {
              const resolvedQuestions = JSON.parse(localStorage.getItem(storageKey) || '[]');
              if (!resolvedQuestions.includes(question.id)) {
                resolvedQuestions.push(question.id);
                localStorage.setItem(storageKey, JSON.stringify(resolvedQuestions));
                console.log("Saved resolved question to localStorage:", question.id, "Total resolved:", resolvedQuestions.length);
              }
            } catch (err) {
              console.error("Failed to save to localStorage:", err);
            }
            if (onResetStatus) {
              console.log("Question had comment, will check and reset status after delay");
              await new Promise(resolve => setTimeout(resolve, 1500));
              console.log("Calling onResetStatus to check if all comments resolved");
              await onResetStatus();
            }
          }
        }}
        isEditable={isEditable}
        initialData={question}
        hasComment={!!question.reviewerComment}
      />
    </div>
  );
};