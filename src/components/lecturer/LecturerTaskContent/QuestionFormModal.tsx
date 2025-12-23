"use client";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import { AssessmentQuestion } from "@/services/assessmentQuestionService";
import { App, Button, Form, Input, Modal } from "antd";
import { useEffect } from "react";
const { TextArea } = Input;
interface QuestionFormModalProps {
  open: boolean;
  onCancel: () => void;
  onFinish: () => void;
  isEditable: boolean;
  initialData?: AssessmentQuestion;
  paperId?: number;
  existingQuestionsCount?: number;
  hasComment?: boolean;
}
export const QuestionFormModal = ({
  open,
  onCancel,
  onFinish,
  isEditable,
  initialData,
  paperId,
  existingQuestionsCount = 0,
  hasComment = false,
}: QuestionFormModalProps) => {
  const [form] = Form.useForm();
  const { notification } = App.useApp();
  const isEditing = !!initialData;
  const title = isEditing ? "Edit Question" : "Add New Question";
  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
        form.setFieldsValue({
          questionNumber: existingQuestionsCount + 1,
        });
      }
    }
  }, [initialData, form, open, existingQuestionsCount]);
  const handleSubmit = async (values: any) => {
    try {
      if (isEditing) {
        const updatePayload = {
          ...values,
          reviewerComment: hasComment ? undefined : initialData?.reviewerComment,
        };
        await assessmentQuestionService.updateAssessmentQuestion(
          initialData!.id,
          updatePayload
        );
        if (hasComment) {
          notification.success({
            message: "Question updated and comment resolved",
            description: "The question has been updated and the reviewer comment has been marked as resolved.",
          });
        } else {
          notification.success({
            message: "Question updated successfully",
          });
        }
      } else {
        await assessmentQuestionService.createAssessmentQuestion({
          ...values,
          assessmentPaperId: paperId,
        });
        notification.success({
          message: "Question created successfully",
        });
      }
      onFinish();
    } catch (error) {
      console.error("Failed to save question:", error);
      notification.error({ message: "Failed to save question" });
    }
  };
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      width={700}
      destroyOnHidden
      footer={[
        <Button key="back" onClick={onCancel}>
          Cancel
        </Button>,
        isEditable ? (
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            {isEditing ? "Save Changes" : "Add Question"}
          </Button>
        ) : null,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="questionNumber"
          label="Question Number"
          rules={[{ required: true }]}
        >
          <Input type="number" disabled={!isEditable || !isEditing} />
        </Form.Item>
        <Form.Item
          name="questionText"
          label="Question Text"
          rules={[{ required: true }]}
        >
          <TextArea rows={4} disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="questionSampleInput" label="Sample Input">
          <TextArea rows={4} disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="questionSampleOutput" label="Sample Output">
          <TextArea rows={4} disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="score" label="Score" rules={[{ required: true }]}>
          <Input type="number" disabled={!isEditable} />
        </Form.Item>
      </Form>
    </Modal>
  );
};