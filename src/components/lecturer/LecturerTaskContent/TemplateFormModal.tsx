"use client";

import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { AssessmentTemplate } from "@/services/assessmentTemplateService";
import { AssignRequestItem, assignRequestService } from "@/services/assignRequestService";
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
  const isRejected = task && Number(task.status) === 3;

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
        
        // If this was a resubmission after rejection, reset status to Pending
        if (isRejected && task) {
          try {
            await assignRequestService.updateAssignRequest(task.id, {
              message: task.message || "Template updated and resubmitted after rejection",
              courseElementId: task.courseElementId,
              assignedLecturerId: task.assignedLecturerId,
              assignedByHODId: task.assignedByHODId,
              status: 1, // Reset to Pending
              assignedAt: task.assignedAt,
            });
            notification.success({
              message: "Template Updated and Resubmitted",
              description: "Template has been updated and status reset to Pending for HOD review.",
            });
          } catch (err: any) {
            console.error("Failed to reset status:", err);
            notification.warning({
              message: "Template Updated",
              description: "Template updated successfully, but failed to reset status. Please contact administrator.",
            });
          }
        } else {
          notification.success({
            message: "Template updated successfully",
          });
        }
        // Invalidate all assessment templates queries
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.assessmentTemplates.all,
          exact: false
        });
        
        // Dispatch custom event to notify other components
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

