"use client";

import { Modal, Checkbox, Space } from "antd";
import { useState } from "react";

interface ExportModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (exportTypes: {
    assignment: boolean;
    lab: boolean;
    practicalExam: boolean;
  }) => void;
}

export const ExportModal = ({ visible, onCancel, onConfirm }: ExportModalProps) => {
  const [exportTypes, setExportTypes] = useState<{
    assignment: boolean;
    lab: boolean;
    practicalExam: boolean;
  }>({
    assignment: true,
    lab: true,
    practicalExam: true,
  });

  const handleOk = () => {
    onConfirm(exportTypes);
  };

  const handleCancel = () => {
    setExportTypes({
      assignment: true,
      lab: true,
      practicalExam: true,
    });
    onCancel();
  };

  return (
    <Modal
      title="Export Grade Report"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Export"
      cancelText="Cancel"
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Checkbox
          checked={exportTypes.assignment}
          onChange={(e) =>
            setExportTypes((prev) => ({ ...prev, assignment: e.target.checked }))
          }
        >
          Assignment
        </Checkbox>
        <Checkbox
          checked={exportTypes.lab}
          onChange={(e) =>
            setExportTypes((prev) => ({ ...prev, lab: e.target.checked }))
          }
        >
          Lab
        </Checkbox>
        <Checkbox
          checked={exportTypes.practicalExam}
          onChange={(e) =>
            setExportTypes((prev) => ({ ...prev, practicalExam: e.target.checked }))
          }
        >
          Practical Exam
        </Checkbox>
      </Space>
    </Modal>
  );
};

