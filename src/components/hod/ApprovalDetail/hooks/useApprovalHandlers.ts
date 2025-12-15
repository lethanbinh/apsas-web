import { useState } from "react";
import { App } from "antd";
import { adminService } from "@/services/adminService";
import { assessmentQuestionService, AssessmentQuestion, UpdateAssessmentQuestionPayload } from "@/services/assessmentQuestionService";
import {
  ApiApprovalItem,
  ApiAssignRequestUpdatePayload,
} from "@/types";

export const useApprovalHandlers = (
  approvalItem: ApiApprovalItem,
  currentStatus: number,
  setCurrentStatus: (status: number) => void,
  questionComments: { [questionId: number]: string },
  papers: any[],
  selectedApproverLecturerId: number | undefined,
  refreshQuestions: () => Promise<void>
) => {
  const { message: antMessage, modal } = App.useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingApprover, setIsUpdatingApprover] = useState(false);
  const [rejectReasonVisibleForItem, setRejectReasonVisibleForItem] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const createPayload = (
    status: number,
    message: string,
    approverLecturerId?: number
  ): ApiAssignRequestUpdatePayload => {
    return {
      message: message,
      courseElementId: approvalItem.courseElementId,
      assignedLecturerId: approvalItem.assignedLecturerId,
      assignedByHODId: approvalItem.assignedByHODId,
      assignedApproverLecturerId: approverLecturerId ?? approvalItem.assignedApproverLecturerId ?? 0,
      status: status,
      assignedAt: approvalItem.assignedAt,
    };
  };

  const handleApproverChange = async (lecturerId: number | null | undefined, setSelectedApproverLecturerId: (id: number | undefined) => void) => {
    setIsUpdatingApprover(true);
    try {
      const approverId = lecturerId ?? 0;
      const payload = createPayload(
        currentStatus,
        approvalItem.message || "Approver assignment updated",
        approverId
      );
      await adminService.updateAssignRequestStatus(approvalItem.id, payload);
      setSelectedApproverLecturerId(approverId === 0 ? undefined : approverId);
      antMessage.success(
        approverId === 0
          ? "Approver assignment removed successfully"
          : "Approver assigned successfully"
      );
    } catch (err: any) {
      console.error("Failed to update approver:", err);
      antMessage.error(err.message || "Failed to update approver assignment");
    } finally {
      setIsUpdatingApprover(false);
    }
  };

  const handleApprove = () => {
    modal.confirm({
      title: "Confirm Approval",
      content: "Are you sure you want to approve this assessment template?",
      okText: "Yes, Approve",
      okType: "primary",
      cancelText: "Cancel",
      onOk: async () => {
        setIsSubmitting(true);
        try {
          const payload = createPayload(5, "Approved by HOD", selectedApproverLecturerId);
          await adminService.updateAssignRequestStatus(approvalItem.id, payload);

          setCurrentStatus(5);
          setRejectReasonVisibleForItem(null);
          antMessage.success("Request approved successfully");
        } catch (err: any) {
          console.error("Failed to approve:", err);
          antMessage.error(err.message || "Failed to approve request");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleRejectClick = (questions: { [paperId: number]: AssessmentQuestion[] }) => {
    if (!rejectReasonVisibleForItem) {
      const firstPaperKey = papers.length > 0 ? `paper-${papers[0].id}` : null;
      if (firstPaperKey) {
        setRejectReasonVisibleForItem(firstPaperKey);
      }
      return;
    }

    if (!rejectReason.trim()) {
      antMessage.error("Please enter a reject reason.");
      return;
    }

    const allQuestions = Object.values(questions).flat();
    const questionsWithComments = allQuestions.filter(
      q => questionComments[q.id] && questionComments[q.id].trim()
    );

    if (questionsWithComments.length === 0) {
      antMessage.error("Please provide comments for at least one question before rejecting.");
      return;
    }

    modal.confirm({
      title: "Confirm Rejection",
      content: "Are you sure you want to reject this assessment template? This action will reject the request with the comments you provided.",
      okText: "Yes, Reject",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        setIsSubmitting(true);
        try {
          for (const question of allQuestions) {
            const comment = questionComments[question.id]?.trim();
            if (comment) {
              const updatePayload: UpdateAssessmentQuestionPayload = {
                questionText: question.questionText,
                questionSampleInput: question.questionSampleInput,
                questionSampleOutput: question.questionSampleOutput,
                score: question.score,
                questionNumber: question.questionNumber,
                reviewerComment: comment,
              };
              await assessmentQuestionService.updateAssessmentQuestion(question.id, updatePayload);
            }
          }

          const payload = createPayload(3, rejectReason, selectedApproverLecturerId);
          await adminService.updateAssignRequestStatus(approvalItem.id, payload);

          setCurrentStatus(3);
          setRejectReasonVisibleForItem(null);
          antMessage.success("Request rejected with comments");
        } catch (err: any) {
          console.error("Failed to reject:", err);
          antMessage.error(err.message || "Failed to reject request");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  return {
    isSubmitting,
    isUpdatingApprover,
    rejectReasonVisibleForItem,
    setRejectReasonVisibleForItem,
    rejectReason,
    setRejectReason,
    handleApproverChange,
    handleApprove,
    handleRejectClick,
  };
};

