"use client";

import { gradingGroupService } from "@/services/gradingGroupService";
import { Lecturer } from "@/services/lecturerService";
import { Submission } from "@/services/submissionService";
import { Alert, App, Form, Modal, Select } from "antd";
import { useState } from "react";

interface CreateGradingGroupModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  allLecturers: Lecturer[];
  unassignedSubmissions: Pick<
    Submission,
    "id" | "studentName" | "studentCode" | "submissionFile"
  >[];
  submissionLecturerIdMap: Record<number, number>;
}

export const CreateGradingGroupModal: React.FC<
  CreateGradingGroupModalProps
> = ({
  open,
  onCancel,
  onOk,
  allLecturers,
  unassignedSubmissions,
  submissionLecturerIdMap,
}) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notification } = App.useApp();
  const selectedLecturerId = Form.useWatch("lecturerId", form) as
    | number
    | undefined;

  const handleFinish = async (values: any) => {
    setIsLoading(true);
    setError(null);
    try {
      await gradingGroupService.createGradingGroup({
        lecturerId: values.lecturerId,
        submissionIds: values.submissionIds,
      });
      notification.success({ message: "Group created successfully!" });
      onOk();
    } catch (err: any) {
      console.error("Failed to create group:", err);
      setError(err.message || "Failed to create group.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title="Create New Grading Group"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={isLoading}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form.Item
          name="lecturerId"
          label="Select Lecturer"
          rules={[{ required: true, message: "Please select a lecturer" }]}
        >
          <Select
            showSearch
            placeholder="Select a lecturer"
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={allLecturers.map((l) => ({
              label: `${l.fullName} (${l.accountCode})`,
              value: Number(l.lecturerId),
            }))}
          />
        </Form.Item>
        <Form.Item
          name="submissionIds"
          label="Select Submissions"
          rules={[{ required: true, message: "Please select submissions" }]}
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="Select unassigned submissions"
            options={unassignedSubmissions
              .filter((s) =>
                selectedLecturerId === undefined
                  ? true
                  : submissionLecturerIdMap[s.id] !== selectedLecturerId
              )
              .map((s) => ({
                label: `ID ${s.id}: ${s.studentName} (${s.submissionFile?.name})`,
                value: s.id,
              }))}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
