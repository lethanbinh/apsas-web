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

const { Title, Text } = Typography;

interface QuestionDetailViewProps {
  question: AssessmentQuestion;
  isEditable: boolean;
  onRubricChange: () => void;
  onQuestionChange: () => void;
  onResetStatus?: () => Promise<void>;
  task?: AssignRequestItem;
}

export const QuestionDetailView = ({
  question,
  isEditable,
  onRubricChange,
  onQuestionChange,
  onResetStatus,
  task,
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
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Card
        title={<Title level={4}>Question Details</Title>}
        extra={
          isEditable && (
            <Button
              icon={<EditOutlined />}
              onClick={() => setIsQuestionModalOpen(true)}
            >
              Edit Question
            </Button>
          )
        }
      >
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Question Number">
            <Text strong>{question.questionNumber || "N/A"}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Question Text">
            <Text style={{ whiteSpace: "pre-wrap" }}>
              {question.questionText}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Sample Input">
            <Text style={{ whiteSpace: "pre-wrap" }}>
              {question.questionSampleInput}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Sample Output">
            <Text style={{ whiteSpace: "pre-wrap" }}>
              {question.questionSampleOutput}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Score">
            <Text strong>{question.score}</Text>
          </Descriptions.Item>
          {}
          {question.reviewerComment && (
            <Descriptions.Item label="Reviewer Comment">
              <div style={{
                padding: "12px",
                backgroundColor: "#e6f4ff",
                borderRadius: "6px",
                border: "1px solid #91caff",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                marginBottom: "8px"
              }}>
                <Text style={{ color: "#1d39c4", lineHeight: "1.6" }}>{question.reviewerComment}</Text>
              </div>
              {question.updatedAt && (
                <Text type="secondary" style={{ fontSize: "12px", color: "#69b1ff" }}>
                  <Text strong style={{ color: "#0958d9" }}>Commented on:</Text> {new Date(question.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </Text>
              )}
              {isRejected && (
                <div style={{ marginTop: "8px" }}>
                  <Text type="secondary" style={{ fontSize: "12px", fontStyle: "italic", color: "#69b1ff" }}>
                    Edit the question content above to resolve this comment.
                  </Text>
                </div>
              )}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      <Card
        title={<Title level={5}>Grading Rubrics</Title>}
        extra={
          isEditable && (
            <Button
              icon={<PlusOutlined />}
              type="dashed"
              onClick={() => openRubricModal()}
              disabled={rubrics.length >= 4}
            >
              Add Rubric {rubrics.length >= 4 ? `(Max 4)` : ``}
            </Button>
          )
        }
      >
        {isLoading ? (
          <Spin />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={rubrics}
            renderItem={(rubric) => (
              <List.Item
                actions={
                  isEditable
                    ? [
                        <Button
                          type="link"
                          onClick={() => openRubricModal(rubric)}
                        >
                          Edit
                        </Button>,
                        <Button
                          type="link"
                          danger
                          onClick={() => handleDeleteRubric(rubric.id)}
                        >
                          Delete
                        </Button>,
                      ]
                    : []
                }
              >
                <List.Item.Meta
                  title={rubric.description}
                  description={`Input: ${rubric.input || "N/A"} | Output: ${
                    rubric.output || "N/A"
                  }`}
                />
                <div>
                  <Text strong>{rubric.score} points</Text>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

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
    </Space>
  );
};

