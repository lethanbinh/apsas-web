"use client";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { AssessmentTemplate } from "@/services/assessmentTemplateService";
import { AssignRequestItem } from "@/services/assignRequestService";
import { App, Button, Form, Input, Modal, Radio } from "antd";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
interface TemplateFormModalProps {
  open: boolean;
  onCancel: () => void;
  onFinish: () => void;
  isEditable: boolean;
  initialData?: AssessmentTemplate;
  assignedToHODId?: number;
  task?: AssignRequestItem;
}
export const TemplateFormModal = ({
  open,
  onCancel,
  onFinish,
  isEditable,
  initialData,
  assignedToHODId,
  task,
}: TemplateFormModalProps) => {
  const [form] = Form.useForm();
  const { notification } = App.useApp();
  const queryClient = useQueryClient();
  const isEditing = !!initialData;
  const title = isEditing ? "Edit Assessment Template" : "Add New Template";
  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          name: initialData.name,
          description: initialData.description,
          templateType: initialData.templateType,
          startupProject: initialData.startupProject || "",
        });
      } else {
        form.resetFields();
      }
    }
  }, [initialData, form, open]);
  const handleSubmit = async (values: any) => {
    try {
      if (isEditing && initialData && assignedToHODId !== undefined) {
        await assessmentTemplateService.updateAssessmentTemplate(
          initialData.id,
          {
            name: values.name,
            description: values.description,
            templateType: values.templateType,
            startupProject: values.templateType === 1 ? values.startupProject : undefined,
            assignedToHODId: assignedToHODId,
          }
        );
        notification.success({
          message: "Template updated successfully",
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.assessmentTemplates.all,
          exact: false
        });
        window.dispatchEvent(new CustomEvent('assessmentTemplatesChanged'));
      }
      onFinish();
    } catch (error) {
      console.error("Failed to save template:", error);
      notification.error({ message: "Failed to save template" });
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
            {isEditing ? "Save Changes" : "Add Template"}
          </Button>
        ) : null,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="name"
          label="Template Name"
          rules={[{ required: true }]}
        >
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item name="description" label="Template Description">
          <Input disabled={!isEditable} />
        </Form.Item>
        <Form.Item
          name="templateType"
          label="Template Type"
          rules={[{ required: true }]}
        >
          <Radio.Group disabled={!isEditable}>
            <Radio value={0}>DSA</Radio>
            <Radio value={1}>WEBAPI</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.templateType !== currentValues.templateType}
        >
          {({ getFieldValue }) => {
            const templateType = getFieldValue("templateType");
            return templateType === 1 ? (
              <Form.Item
                name="startupProject"
                label="Startup Project"
                rules={[{ required: true, message: "Startup Project is required for WEBAPI templates" }]}
              >
                <Input disabled={!isEditable} placeholder="Enter startup project" />
              </Form.Item>
            ) : null;
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
};