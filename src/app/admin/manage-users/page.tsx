"use client";
import { CreateUserFormModal } from "@/components/admin/CreateUserFormModal";
import { DeleteConfirmationModal } from "@/components/admin/DeleteConfirmationModal";
import { ImportResultsModal } from "@/components/admin/ImportResultsModal";
import { Pagination } from "@/components/admin/Pagination";
import { SearchAndActionsBar } from "@/components/admin/SearchAndActionsBar";
import { UserTable } from "@/components/admin/UserTable";
import { useAccountExport } from "@/hooks/useAccountExport";
import { useAccountImport } from "@/hooks/useAccountImport";
import { useAuth } from "@/hooks/useAuth";
import { Role, ROLES } from "@/lib/constants";
import { queryKeys } from "@/lib/react-query";
import { accountService } from "@/services/accountService";
import { adminService } from "@/services/adminService";
import { examinerService } from "@/services/examinerService";
import { lecturerService } from "@/services/lecturerService";
import { studentManagementService } from "@/services/studentManagementService";
import { User, UserUpdatePayload } from "@/types";
import { generateSampleTemplate } from "@/utils/excelUtils";
import { getPaginationItems, mapRoleToString } from "@/utils/userUtils";
import { App, Alert, Spin } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import styles from "./ManageUsers.module.css";
const ManageUsersPageContent: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { notification } = App.useApp();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState<boolean>(false);
  const [importResultVisible, setImportResultVisible] = useState<boolean>(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; accountCode?: string; email?: string; error: string }>;
  }>({ success: 0, failed: 0, errors: [] });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);
  const [usersToDelete, setUsersToDelete] = useState<User[]>([]);
  const hasFilter = searchTerm.trim() !== "" || selectedRole !== undefined;
  const { data: allUsersResponse, isLoading: allUsersLoading } = useQuery({
    queryKey: ['users', 'all', 'filter'],
    queryFn: () => accountService.getAccountList(1, 10000),
    enabled: hasFilter,
  });
  const { data: usersResponse, isLoading: loading, error: queryError } = useQuery({
    queryKey: queryKeys.users.list({ page: currentPage, pageSize }),
    queryFn: () => accountService.getAccountList(currentPage, pageSize),
    enabled: !hasFilter,
  });
  const baseUsers = hasFilter
    ? (allUsersResponse?.users || [])
    : (usersResponse?.users || []);
  const totalUsers = hasFilter
    ? (allUsersResponse?.total || 0)
    : (usersResponse?.total || 0);
  const isLoading = hasFilter ? allUsersLoading : loading;
  const error = queryError ? (queryError as any).message || "Failed to fetch users" : null;
  const filteredUsers = useMemo(() => {
    let filtered = baseUsers;
    if (selectedRole !== undefined) {
      filtered = filtered.filter(user => Number(user.role) === Number(selectedRole));
    }
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(user =>
        user.email?.toLowerCase().includes(searchLower) ||
        user.fullName?.toLowerCase().includes(searchLower) ||
        user.accountCode?.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower) ||
        user.phoneNumber?.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [baseUsers, searchTerm, selectedRole]);
  const paginatedUsers = useMemo(() => {
    if (!hasFilter) {
      return baseUsers;
    }
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, baseUsers, currentPage, pageSize, hasFilter]);
  const filteredTotal = filteredUsers.length;
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole]);
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (hasFilter) {
        queryClient.invalidateQueries({
          queryKey: ['users', 'all', 'filter']
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.list({ page: currentPage, pageSize })
        });
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [hasFilter, currentPage, pageSize, queryClient]);
  const { importAccounts, importLoading } = useAccountImport();
  const { handleExportAllAccounts, exportLoading } = useAccountExport();
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, payload }: { userId: number; payload: UserUpdatePayload }) => {
      return adminService.updateAccount(userId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setIsEditModalVisible(false);
      setEditingUser(null);
      notification.success({ message: "User updated successfully" });
    },
    onError: (err: any) => {
      console.error("Failed to update user:", err);
      notification.error({
        message: "Update Failed",
        description: err.message || "Failed to update user"
      });
    },
  });
  const createUserMutation = useMutation({
    mutationFn: async ({ payload, role }: { payload: any; role: Role }) => {
      switch (role) {
        case ROLES.ADMIN:
          return adminService.createAdmin(payload);
        case ROLES.LECTURER:
          return lecturerService.createLecturer(payload);
        case ROLES.STUDENT:
          return studentManagementService.createStudent(payload);
        case ROLES.HOD:
          return adminService.createHOD(payload);
        case ROLES.EXAMINER:
          return examinerService.createExaminer(payload);
        default:
          throw new Error("Invalid role");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setIsCreateModalVisible(false);
      notification.success({ message: "User created successfully" });
    },
    onError: (err: any) => {
      console.error("Failed to create user:", err);
      const errorMessage = err.response?.data?.errorMessages?.[0] || err.message || "Failed to create user";
      notification.error({
        message: "Create Failed",
        description: errorMessage
      });
    },
  });
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountIds: number[]) => {
      const results = await Promise.allSettled(
        accountIds.map(id => accountService.deleteAccount(id))
      );
      const successful: number[] = [];
      const failed: Array<{ id: number; error: string }> = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successful.push(accountIds[index]);
        } else {
          const errorMessage = result.reason?.response?.data?.errorMessages?.[0] ||
                             result.reason?.message ||
                             "Failed to delete account";
          failed.push({ id: accountIds[index], error: errorMessage });
        }
      });
      return { successful, failed };
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setSelectedUserIds([]);
      setIsDeleteModalVisible(false);
      setUsersToDelete([]);
      if (results.failed.length === 0) {
        notification.success({
          message: "Delete Successful",
          description: `Successfully deleted ${results.successful.length} account(s).`
        });
      } else if (results.successful.length > 0) {
        notification.warning({
          message: "Partially Successful",
          description: `Deleted ${results.successful.length} account(s). ${results.failed.length} account(s) failed. Check console for details.`,
          duration: 5
        });
        console.error("Failed deletions:", results.failed);
      } else {
        const errorMessages = results.failed.map(f => f.error).join(", ");
        notification.error({
          message: "Delete Failed",
          description: `Failed to delete all accounts: ${errorMessages}`,
          duration: 5
        });
      }
    },
    onError: (err: any) => {
      console.error("Failed to delete account(s):", err);
      const errorMessage = err.response?.data?.errorMessages?.[0] || err.message || "Failed to delete account(s)";
      notification.error({
        message: "Delete Failed",
        description: errorMessage
      });
    },
  });
  const showEditModal = (user: User) => {
    setEditingUser(user);
    setIsEditModalVisible(true);
  };
  const handleEditOk = async (values: UserUpdatePayload, role: Role) => {
    if (editingUser) {
        const updatePayload = {
          phoneNumber: (values as UserUpdatePayload).phoneNumber,
          fullName: (values as UserUpdatePayload).fullName,
          address: (values as UserUpdatePayload).address,
        };
      updateUserMutation.mutate({ userId: editingUser.id, payload: updatePayload });
    }
  };
  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingUser(null);
  };
  const handleCreateOk = async (values: any, role: Role) => {
    createUserMutation.mutate({ payload: values, role });
  };
  const handleCreateCancel = () => {
    setIsCreateModalVisible(false);
  };
  const handleDeleteClick = (user?: User) => {
    if (user) {
      setUsersToDelete([user]);
    } else {
      const selectedUsers = filteredUsers.filter(u => selectedUserIds.includes(u.id));
      setUsersToDelete(selectedUsers);
    }
    setIsDeleteModalVisible(true);
  };
  const handleDeleteConfirm = (confirmText: string) => {
    if (!usersToDelete.length) return;
    if (usersToDelete.length === 1) {
      const user = usersToDelete[0];
      const expectedText = user.accountCode || user.email || "";
      if (confirmText.trim() !== expectedText.trim()) {
        notification.error({
          message: "Confirmation Failed",
          description: `Please type "${expectedText}" to confirm deletion.`,
        });
        return;
          }
        } else {
      const expectedText = `DELETE ${usersToDelete.length}`;
      if (confirmText.trim() !== expectedText.trim() && confirmText.trim() !== "DELETE") {
        notification.error({
          message: "Confirmation Failed",
          description: `Please type "${expectedText}" or "DELETE" to confirm deletion.`,
        });
        return;
      }
    }
    const accountIds = usersToDelete.map(u => u.id);
    const hasSelf = accountIds.includes(currentUser?.id || -1);
    const hasOtherAdmins = usersToDelete.some(u => u.role === ROLES.ADMIN && u.id !== currentUser?.id);
    if (hasSelf) {
      notification.error({
        message: "Delete Failed",
        description: "You cannot delete your own account.",
      });
      return;
    }
    if (hasOtherAdmins) {
      notification.error({
        message: "Delete Failed",
        description: "You cannot delete other admin accounts.",
        });
        return;
      }
    deleteAccountMutation.mutate(accountIds);
  };
  const handleDeleteCancel = () => {
    setIsDeleteModalVisible(false);
    setUsersToDelete([]);
  };
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allUserIds = filteredUsers
        .filter(u => u.id !== currentUser?.id && u.role !== ROLES.ADMIN)
        .map(u => u.id);
      setSelectedUserIds(allUserIds);
    } else {
      setSelectedUserIds([]);
    }
  };
  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUserIds([...selectedUserIds, userId]);
    } else {
      setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
    }
  };
  const handleImportFile = async (file: File) => {
    try {
      const results = await importAccounts(file);
      setImportResults({
        success: results.success,
        failed: results.failed,
        errors: results.errors.map(err => ({
          row: err.row,
          email: err.email,
          error: err.error,
        })),
      });
      setImportResultVisible(true);
    } catch (error) {
    }
  };
  const handleDownloadTemplate = () => {
    try {
      generateSampleTemplate();
      notification.success({
        message: "Template Downloaded",
        description: "Excel template with 50 sample accounts has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Failed to download sample template:", error);
      notification.error({
        message: "Download Failed",
        description: "Failed to download sample template. Please try again.",
      });
    }
  };
  const totalPages = hasFilter ? Math.ceil(filteredTotal / pageSize) : Math.ceil(totalUsers / pageSize);
  const displayUsers = paginatedUsers;
  const isIndeterminate = selectedUserIds.length > 0 && selectedUserIds.length < displayUsers.filter(u => u.id !== currentUser?.id && u.role !== ROLES.ADMIN).length;
  const isAllSelected = selectedUserIds.length > 0 && selectedUserIds.length === displayUsers.filter(u => u.id !== currentUser?.id && u.role !== ROLES.ADMIN).length;
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Manage users</h1>
      <SearchAndActionsBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        selectedUserIdsCount={selectedUserIds.length}
        onDeleteSelected={() => handleDeleteClick()}
        onCreateUser={() => setIsCreateModalVisible(true)}
        onExportAll={handleExportAllAccounts}
        exportLoading={exportLoading}
        onDownloadTemplate={handleDownloadTemplate}
        onImportFile={handleImportFile}
        importLoading={importLoading}
      />
      {isLoading && !baseUsers.length ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spin size="large" />
      </div>
      ) : error ? (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : !isLoading && !error && hasFilter && filteredUsers.length === 0 ? (
        <p>No users found matching your filters.</p>
      ) : !isLoading && !error && !hasFilter && (!baseUsers || baseUsers.length === 0) ? (
        <p>No users found.</p>
      ) : (
        <UserTable
          users={displayUsers}
          currentPage={currentPage}
          pageSize={pageSize}
          currentUserId={currentUser?.id}
          selectedUserIds={selectedUserIds}
          isIndeterminate={isIndeterminate}
          isAllSelected={isAllSelected}
          onSelectAll={handleSelectAll}
          onSelectUser={handleSelectUser}
          onEdit={showEditModal}
          onDelete={handleDeleteClick}
          mapRoleToString={mapRoleToString}
        />
      )}
      {!isLoading && !error && ((hasFilter && filteredTotal > pageSize) || (!hasFilter && totalUsers > pageSize)) && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onPrevPage={() => setCurrentPage(Math.max(1, currentPage - 1))}
          onNextPage={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          getPaginationItems={() => getPaginationItems(currentPage, totalPages)}
        />
      )}
      {isEditModalVisible && (
        <CreateUserFormModal
          visible={isEditModalVisible}
          onCancel={handleEditCancel}
          onOk={handleEditOk}
          editingUser={editingUser}
          confirmLoading={updateUserMutation.isPending}
        />
      )}
      {isCreateModalVisible && (
        <CreateUserFormModal
          visible={isCreateModalVisible}
          onCancel={handleCreateCancel}
          onOk={handleCreateOk}
          editingUser={null}
          confirmLoading={createUserMutation.isPending}
        />
      )}
      <ImportResultsModal
        open={importResultVisible}
        results={importResults}
        onClose={() => setImportResultVisible(false)}
      />
      <DeleteConfirmationModal
        open={isDeleteModalVisible}
        usersToDelete={usersToDelete}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        loading={deleteAccountMutation.isPending}
      />
    </div>
  );
};
export default function ManageUsersPage() {
  return (
    <App>
      <ManageUsersPageContent />
    </App>
  );
}