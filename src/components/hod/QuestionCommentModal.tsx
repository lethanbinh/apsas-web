"use client";
import { useState, useEffect } from "react";
import { Modal, Input, Button, Space, Typography, App } from "antd";
import { assessmentQuestionService, UpdateAssessmentQuestionPayload, AssessmentQuestion } from "@/services/assessmentQuestionService";
const { TextArea } = Input;
const { Text } = Typography;
interface QuestionCommentModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  question: AssessmentQuestion | null;
  isRejected?: boolean;
  disabled?: boolean;
}
export function QuestionCommentModal({
  open,
  onCancel,
  onSuccess,
  question,
  isRejected = false,
  disabled = false,
}: QuestionCommentModalProps) {
  const [comment, setComment] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { message: antMessage } = App.useApp();
  useEffect(() => {
    if (question && open) {
      setComment(question.reviewerComment || "");
    }
  }, [question, open]);
  const handleSave = async () => {
    if (!question) return;
    setIsUpdating(true);
    try {
      const updatePayload: UpdateAssessmentQuestionPayload = {
        questionText: question.questionText,
        questionSampleInput: question.questionSampleInput,
        questionSampleOutput: question.questionSampleOutput,
        score: question.score,
        questionNumber: question.questionNumber,
        reviewerComment: comment.trim() || undefined,
      };
      await assessmentQuestionService.updateAssessmentQuestion(question.id, updatePayload);
      antMessage.success("Comment updated successfully");
      onSuccess();
      onCancel();
    } catch (err: any) {
      console.error("Failed to update comment:", err);
      antMessage.error(err.message || "Failed to update comment");
    } finally {
      setIsUpdating(false);
    }
  };
  return (
    <Modal
      title={
        <div>
          <Text strong>Reviewer Comment</Text>
          {question && (
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 14 }}>
              - Question {question.questionNumber}
            </Text>
          )}
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={isUpdating}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          loading={isUpdating}
          disabled={disabled || isUpdating}
        >
          Save Comment
        </Button>,
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div>
          <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
            {isRejected
              ? "Enter your response to the reviewer comment for this question:"
              : "Enter your comment for this question:"}
          </Text>
          <TextArea
            rows={6}
            placeholder={
              isRejected
                ? "Enter your response to the reviewer comment..."
                : "Enter your comment for this question..."
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={disabled || isUpdating}
          />
        </div>
        {question?.reviewerComment && !isRejected && (
          <div style={{
            padding: "14px",
            backgroundColor: "#e6f4ff",
            borderRadius: "6px",
            border: "1px solid #91caff",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)"
          }}>
            <Text strong style={{ display: "block", marginBottom: 6, color: "#0958d9", fontSize: "13px" }}>
              Previous Comment:
            </Text>
            <div style={{
              padding: "10px",
              backgroundColor: "#fff",
              borderRadius: "4px",
              border: "1px solid #91caff",
              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.04)"
            }}>
              <Text style={{ color: "#1d39c4", lineHeight: "1.6" }}>{question.reviewerComment}</Text>
            </div>
          </div>
        )}
      </Space>
    </Modal>
  );
}