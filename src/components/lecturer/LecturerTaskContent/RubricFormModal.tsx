"use client";

import { rubricItemService } from "@/services/rubricItemService";
import { RubricItem } from "@/services/rubricItemService";
import { App, Button, Form, Input, Modal } from "antd";
import { useEffect } from "react";

interface RubricFormModalProps {
  open: boolean;
  onCancel: () => void;
  onFinish: () => void;
  isEditable: boolean;
  initialData?: RubricItem;
  questionId?: number;
}

export const RubricFormModal = ({
  open,
  onCancel,
  onFinish,
  isEditable,
  initialData,
  questionId,
}: RubricFormModalProps) => {
  const [form] = Form.useForm();
  const { notification } = App.useApp();
  const isEditing = !!initialData;
  const title = isEditing ? "Edit Rubric" : "Add New Rubric";

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
      }
    }
  }, [initialData, form, open]);

  const handleSubmit = async (values: any) => {
    try {
      if (isEditing) {
        await rubricItemService.updateRubricItem(initialData!.id, values);
      } else {
        await rubricItemService.createRubricItem({
          ...values,
          assessmentQuestionId: questionId,
        });
      }
      notification.success({
        message: `Rubric ${isEditing ? "updated" : "created"} successfully`,
      });
      onFinish();
    } catch (error) {
      console.error("Failed to save rubric:", error);
      notification.error({ message: "Failed to save rubric" });
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="back" onClick={onCancel}>
          Cancel
        </Button>,
        isEditable ? (
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            {isEditing ? "Save Changes" : "Add Rubric"}
          </Button>
        ) : null,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true }]}
        >
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="input" label="Input">
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="output" label="Output">
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="score" label="Score" rules={[{ required: true }]}>
          <Input type="number" disabled={!isEditable} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

