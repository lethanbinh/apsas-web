"use client";
import { User } from "@/types";
import { Alert, Button, Input, Modal, Space } from "antd";
import { useState } from "react";
interface DeleteConfirmationModalProps {
  open: boolean;
  usersToDelete: User[];
  onCancel: () => void;
  onConfirm: (confirmText: string) => void;
  loading?: boolean;
}
export const DeleteConfirmationModal = ({
  open,
  usersToDelete,
  onCancel,
  onConfirm,
  loading = false,
}: DeleteConfirmationModalProps) => {
  const [confirmText, setConfirmText] = useState<string>("");
  const handleConfirm = () => {
    onConfirm(confirmText);
  };
  const handleCancel = () => {
    setConfirmText("");
    onCancel();
  };
  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#ff4d4f", fontSize: "20px" }}>⚠️</span>
          <span>Delete Account{usersToDelete.length > 1 ? "s" : ""}</span>
        </div>
      }
      open={open}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="delete"
          danger
          type="primary"
          onClick={handleConfirm}
          loading={loading}
          disabled={!confirmText.trim()}
        >
          Delete
        </Button>,
      ]}
      width={500}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Alert
          message="This action cannot be undone."
          description={
            usersToDelete.length === 1
              ? `This will permanently delete the account "${usersToDelete[0].email || usersToDelete[0].accountCode}".`
              : `This will permanently delete ${usersToDelete.length} accounts.`
          }
          type="warning"
          showIcon
        />
        {usersToDelete.length === 1 ? (
          <div>
            <p style={{ marginBottom: "8px", fontWeight: 500 }}>
              To confirm, type <strong>{usersToDelete[0].accountCode || usersToDelete[0].email}</strong>:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={usersToDelete[0].accountCode || usersToDelete[0].email}
              onPressEnter={handleConfirm}
            />
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: "8px", fontWeight: 500 }}>
              To confirm, type <strong>DELETE {usersToDelete.length}</strong> or <strong>DELETE</strong>:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`DELETE ${usersToDelete.length}`}
              onPressEnter={handleConfirm}
            />
            <div style={{ marginTop: "12px", fontSize: "12px", color: "#666" }}>
              <p>Accounts to be deleted:</p>
              <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                {usersToDelete.slice(0, 5).map((u) => (
                  <li key={u.id}>{u.email || u.accountCode}</li>
                ))}
                {usersToDelete.length > 5 && (
                  <li>... and {usersToDelete.length - 5} more</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </Space>
    </Modal>
  );
};