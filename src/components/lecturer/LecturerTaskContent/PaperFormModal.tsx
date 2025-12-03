"use client";

import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentPaper } from "@/services/assessmentPaperService";
import { App, Button, Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";

interface PaperFormModalProps {
  open: boolean;
  onCancel: () => void;
  onFinish: () => void;
  isEditable: boolean;
  initialData?: AssessmentPaper;
  templateId?: number;
}

export const PaperFormModal = ({
  open,
  onCancel,
  onFinish,
  isEditable,
  initialData,
  templateId,
}: PaperFormModalProps) => {
  const [form] = Form.useForm();
  const { notification } = App.useApp();
  const isEditing = !!initialData;
  const title = isEditing ? "Edit Paper" : "Add New Paper";

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
          language: initialData.language ?? 0, // Default to 0 (CSharp) if not set
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ language: 0 }); // Default to CSharp for new paper
      }
    }
  }, [initialData, form, open]);

  const handleSubmit = async (values: any) => {
    try {
      if (isEditing) {
        await assessmentPaperService.updateAssessmentPaper(
          initialData!.id,
          values
        );
      } else {
        await assessmentPaperService.createAssessmentPaper({
          ...values,
          assessmentTemplateId: templateId,
        });
      }
      notification.success({
        message: `Paper ${isEditing ? "updated" : "created"} successfully`,
      });
      onFinish();
    } catch (error) {
      console.error("Failed to save paper:", error);
      notification.error({ message: "Failed to save paper" });
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
            {isEditing ? "Save Changes" : "Add Paper"}
          </Button>
        ) : null,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="name" label="Paper Name" rules={[{ required: true }]}>
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="description" label="Paper Description">
          <Input.TextArea rows={3} disabled={!isEditable} />
        </Form.Item>
        <Form.Item 
          name="language" 
          label="Language" 
          rules={[{ required: true, message: "Please select a language" }]}
        >
          <Select disabled={!isEditable}>
            <Select.Option value={0}>CSharp</Select.Option>
            <Select.Option value={1}>C</Select.Option>
            <Select.Option value={2}>Java</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

