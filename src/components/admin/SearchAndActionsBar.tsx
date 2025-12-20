"use client";

import { DeleteOutlined, DownloadOutlined, FileExcelOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { App, Button, Dropdown, Input, Select, Space, Typography, Upload } from "antd";
import type { MenuProps, UploadProps } from "antd";
import { Role, ROLES } from "@/lib/constants";
import { mapRoleToString } from "@/utils/userUtils";
import styles from "../../app/admin/manage-users/ManageUsers.module.css";

const { Text } = Typography;

interface SearchAndActionsBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedRole?: Role;
  onRoleChange: (role: Role | undefined) => void;
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
  selectedRole,
  onRoleChange,
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

  const handleExportMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'export') {
      onExportAll();
    } else if (key === 'template') {
      onDownloadTemplate();
    }
  };

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'export',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileExcelOutlined /> Export All Accounts
        </span>
      ),
      disabled: exportLoading,
    },
    {
      key: 'template',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DownloadOutlined /> Download Template
        </span>
      ),
    },
  ];

  const roleOptions = [
    { label: mapRoleToString(ROLES.ADMIN), value: ROLES.ADMIN },
    { label: mapRoleToString(ROLES.LECTURER), value: ROLES.LECTURER },
    { label: mapRoleToString(ROLES.STUDENT), value: ROLES.STUDENT },
    { label: mapRoleToString(ROLES.HOD), value: ROLES.HOD },
    { label: mapRoleToString(ROLES.EXAMINER), value: ROLES.EXAMINER },
  ];

  return (
    <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
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
            Create User
          </Button>
          {selectedUserIdsCount > 0 && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={onDeleteSelected}
              className={styles["rounded-button"]}
            >
              Delete ({selectedUserIdsCount})
            </Button>
          )}
          <Dropdown menu={{ items: exportMenuItems, onClick: handleExportMenuClick }} trigger={['click']}>
            <Button
              icon={<FileExcelOutlined />}
              loading={exportLoading}
              className={styles["rounded-button"]}
            >
              Export
            </Button>
          </Dropdown>
          <Upload {...uploadProps}>
            <Button
              icon={<UploadOutlined />}
              loading={importLoading}
              className={styles["rounded-button"]}
            >
              Import
            </Button>
          </Upload>
        </Space>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Text strong style={{ minWidth: "80px" }}>Filter by Role:</Text>
        <Select
          style={{ width: 200 }}
          placeholder="All Roles"
          allowClear
          value={selectedRole}
          onChange={(value) => {
            // When clear button is clicked, value will be null, convert to undefined
            onRoleChange(value === null ? undefined : value);
          }}
          options={roleOptions}
        />
      </div>
    </div>
  );
};

