"use client";

import { DeleteOutlined, DownloadOutlined, FileExcelOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { App, Button, Input, Space, Upload } from "antd";
import type { UploadProps } from "antd";
import styles from "../../app/admin/manage-users/ManageUsers.module.css";

interface SearchAndActionsBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedUserIdsCount: number;
  onDeleteSelected: () => void;
  onCreateUser: () => void;
  onExportAll: () => void;
  exportLoading: boolean;
  onDownloadTemplate: () => void;
  onImportFile: (file: File) => void;
  importLoading: boolean;
}

export const SearchAndActionsBar = ({
  searchTerm,
  onSearchChange,
  selectedUserIdsCount,
  onDeleteSelected,
  onCreateUser,
  onExportAll,
  exportLoading,
  onDownloadTemplate,
  onImportFile,
  importLoading,
}: SearchAndActionsBarProps) => {
  const { notification } = App.useApp();

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const isExcel = file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                     file.type === "application/vnd.ms-excel" ||
                     file.name.endsWith(".xlsx") ||
                     file.name.endsWith(".xls");
      if (!isExcel) {
        notification.error({
          message: "Invalid File Type",
          description: "Please upload an Excel file (.xlsx or .xls)",
        });
        return Upload.LIST_IGNORE;
      }
      onImportFile(file);
      return false;
    },
    showUploadList: false,
    maxCount: 1,
  };

  return (
    <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
      <Input
        placeholder="Search by email, name, account code, username, or phone number..."
        prefix={<SearchOutlined />}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        allowClear
        style={{ maxWidth: "500px", flex: "1", minWidth: "300px" }}
      />
      <Space wrap>
        <Button
          type="primary"
          onClick={onCreateUser}
          style={{
            backgroundColor: "#4cbfb6",
            borderColor: "#4cbfb6",
          }}
          className={styles["rounded-button"]}
        >
          Create New User
        </Button>
        {selectedUserIdsCount > 0 && (
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={onDeleteSelected}
            className={styles["rounded-button"]}
          >
            Delete Selected ({selectedUserIdsCount})
          </Button>
        )}
        <Button
          icon={<FileExcelOutlined />}
          onClick={onExportAll}
          loading={exportLoading}
          className={styles["rounded-button"]}
        >
          Export All Accounts
        </Button>
        <Button
          icon={<DownloadOutlined />}
          onClick={onDownloadTemplate}
          className={styles["rounded-button"]}
        >
          Download Template
        </Button>
        <Upload {...uploadProps}>
          <Button
            icon={<UploadOutlined />}
            loading={importLoading}
            className={styles["rounded-button"]}
          >
            Import Excel
          </Button>
        </Upload>
      </Space>
    </div>
  );
};

