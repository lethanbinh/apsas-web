"use client";

import { ROLES } from "@/lib/constants";
import { User } from "@/types";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Checkbox, Space } from "antd";
import styles from "../../app/admin/manage-users/ManageUsers.module.css";

interface UserTableProps {
  users: User[];
  currentPage: number;
  pageSize: number;
  currentUserId?: number;
  selectedUserIds: number[];
  isIndeterminate: boolean;
  isAllSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectUser: (userId: number, checked: boolean) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  mapRoleToString: (role: number) => string;
}

export const UserTable = ({
  users,
  currentPage,
  pageSize,
  currentUserId,
  selectedUserIds,
  isIndeterminate,
  isAllSelected,
  onSelectAll,
  onSelectUser,
  onEdit,
  onDelete,
  mapRoleToString,
}: UserTableProps) => {
  return (
    <table className={styles.table}>
      <thead className={styles["table-header"]}>
        <tr>
          <th>
            <Checkbox
              indeterminate={isIndeterminate}
              checked={isAllSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          </th>
          <th>
            <span>No</span>
          </th>
          <th>
            <span>Email</span>
          </th>
          <th>
            <span>Full name</span>
          </th>
          <th>
            <span>Date</span>
          </th>
          <th>
            <span>Roll</span>
          </th>
          <th>
            <span>Account Code</span>
          </th>
          <th>
            <span>Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {users.map((user, index) => {
          const isCurrentUser = user.id === currentUserId;
          const isOtherAdmin = user.role === ROLES.ADMIN && user.id !== currentUserId;
          const canDelete = !isCurrentUser && !isOtherAdmin;
          const isSelected = selectedUserIds.includes(user.id);

          return (
            <tr
              key={user.id}
              className={styles["table-row"]}
              onClick={() => onEdit(user)}
              style={{ cursor: "pointer" }}
            >
              <td onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (canDelete) {
                      onSelectUser(user.id, e.target.checked);
                    }
                  }}
                  disabled={!canDelete}
                />
              </td>
              <td>{(currentPage - 1) * pageSize + index + 1}</td>
              <td>{user.email}</td>
              <td>{user.fullName}</td>
              <td>{new Date(user.dateOfBirth).toLocaleDateString()}</td>
              <td>{mapRoleToString(user.role)}</td>
              <td>{user.accountCode}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEdit(user)}
                    className={styles["rounded-button"]}
                  />
                  {canDelete && (
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => onDelete(user)}
                      className={styles["rounded-button"]}
                    />
                  )}
                </Space>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};


