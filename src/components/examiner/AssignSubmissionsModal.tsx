"use client";

import {
  GradingGroup,
  gradingGroupService,
} from "@/services/gradingGroupService";
import { Submission } from "@/services/submissionService";
import { Alert, App, Modal, Transfer, Select, Typography, Space } from "antd";
import { useEffect, useState } from "react";
import type { Key } from "react";

interface AssignSubmissionsModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  group: GradingGroup;
  unassignedSubmissions: Pick<
    Submission,
    "id" | "studentName" | "studentCode" | "submissionFile"
  >[];
  submissionLecturerIdMap: Record<number, number>;
  allGroups: GradingGroup[];
}

export const AssignSubmissionsModal: React.FC<AssignSubmissionsModalProps> = ({
  open,
  onCancel,
  onOk,
  group,
  unassignedSubmissions,
  submissionLecturerIdMap,
  allGroups,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetKeys, setTargetKeys] = useState<Key[]>([]);
  const [targetGroupId, setTargetGroupId] = useState<number | null>(null);
  const { notification } = App.useApp();

  const transferDataSource = [
    ...unassignedSubmissions.map((s) => ({
      key: s.id.toString(),
      title: `${s.studentName} (${s.studentCode}) - File ID: ${s.id}`,
      disabled:
        submissionLecturerIdMap[s.id] !== undefined &&
        submissionLecturerIdMap[s.id] === group.lecturerId,
    })),
    ...group.submissions.map((s) => ({
      key: s.id.toString(),
      title: `${s.studentName} (${s.studentCode}) - File ID: ${s.id}`,
      disabled: false,
    })),
  ];

  const originalAssignedKeys: Key[] = group.submissions.map((s) =>
    s.id.toString()
  );

  useEffect(() => {
    setTargetKeys(originalAssignedKeys);
  }, [open, group]);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newKeys = new Set(targetKeys.map(Number));
      const oldKeys = new Set(originalAssignedKeys.map(Number));

      const addedIds = Array.from(newKeys).filter((id) => !oldKeys.has(id));
      const removedIds = Array.from(oldKeys).filter((id) => !newKeys.has(id));

      if (removedIds.length > 0 && !targetGroupId) {
        setError(
          "Please select a target grading group to move removed submissions."
        );
        setIsLoading(false);
        return;
      }

      if (removedIds.length > 0 && targetGroupId) {
        const targetGroup = allGroups.find((g) => g.id === targetGroupId);
        if (!targetGroup) {
          setError("Invalid target grading group.");
          setIsLoading(false);
          return;
        }
        const invalidForTarget = removedIds.some(
          (id) => submissionLecturerIdMap[id] === targetGroup.lecturerId
        );
        if (invalidForTarget) {
          setError(
            "Cannot move: Target group's lecturer matches the class lecturer."
          );
          setIsLoading(false);
          return;
        }
      }

      if (addedIds.length > 0) {
        await gradingGroupService.assignSubmissions(group.id, {
          submissionIds: addedIds,
        });
      }

      if (removedIds.length > 0) {
        await gradingGroupService.removeSubmissions(group.id, {
          submissionIds: removedIds,
          targetGradingGroupId: targetGroupId ?? 0,
        });
      }

      notification.success({ message: "Assignments updated successfully!" });
      onOk();
    } catch (err: any) {
      console.error("Failed to update assignments:", err);
      setError(err.message || "Failed to update assignments.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    newTargetKeys: Key[],
    direction: "left" | "right",
    moveKeys: Key[]
  ) => {
    // Chặn thêm vào nhóm hiện tại nếu trùng giảng viên lớp
    if (direction === "right") {
      const hasConflict = moveKeys.some((k) => {
        const id = Number(k);
        return (
          submissionLecturerIdMap[id] !== undefined &&
          submissionLecturerIdMap[id] === group.lecturerId
        );
      });
      if (hasConflict) {
        setError("Cannot assign: Lecturer cannot grade their own class.");
        return;
      }
    }
    // Không chặn kéo ra; xác thực đích khi bấm Lưu
    setTargetKeys(newTargetKeys);
  };

  return (
    <Modal
      title={`Assign to ${group.lecturerName}`}
      open={open}
      onCancel={onCancel}
      onOk={handleSave}
      confirmLoading={isLoading}
      width={800}
      destroyOnClose
    >
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Space direction="vertical" style={{ width: "100%", marginBottom: 12 }}>
        <Typography.Text strong>Move assign to others teachers</Typography.Text>
        <Select
          allowClear
          placeholder="Select target grading group"
          value={targetGroupId ?? undefined}
          onChange={(v) => setTargetGroupId(v ?? null)}
          options={allGroups
            .filter((g) => g.id !== group.id)
            .map((g) => ({
              label: g.lecturerName ?? `Group #${g.id}`,
              value: g.id,
            }))}
          style={{ width: 360 }}
        />
      </Space>
      <Transfer
        dataSource={transferDataSource}
        titles={["Pool", `Assigned to ${group.lecturerName}`]}
        targetKeys={targetKeys}
        onChange={handleChange}
        render={(item) => item.title}
        listStyle={{
          width: 350,
          height: 400,
        }}
        showSearch
      />
    </Modal>
  );
};
