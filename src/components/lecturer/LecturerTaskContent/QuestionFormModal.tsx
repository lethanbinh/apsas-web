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
}

export const QuestionFormModal = ({
  open,
  onCancel,
  onFinish,
  isEditable,
  initialData,
  paperId,
  existingQuestionsCount = 0,
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
        // When creating new question, auto-fill questionNumber
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
        await assessmentQuestionService.updateAssessmentQuestion(
          initialData!.id,
          values
        );
      } else {
        await assessmentQuestionService.createAssessmentQuestion({
          ...values,
          assessmentPaperId: paperId,
        });
      }
      notification.success({
        message: `Question ${isEditing ? "updated" : "created"} successfully`,
      });
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

