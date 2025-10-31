"use client";

import React, { useState, useEffect } from "react";
import LayoutAdmin from "@/components/layout/LayoutAdmin";
import styles from "./ManageUsers.module.css";
import { accountService } from "@/services/accountService"; // For fetching account list
import { adminService } from "@/services/adminService"; // For Admin CRUD operations
import { User, UserUpdatePayload } from "@/types";
import { Modal, Button } from "antd";
import { UserDetailFormModal } from "@/components/admin/UserDetailFormModal";

const ManageUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10); // Users per page
  const [totalUsers, setTotalUsers] = useState<number>(0);
  // Removed delete functionality
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] =
    useState<boolean>(false); // State for create modal

  // Delete functionality removed

  // Handlers for edit modal
  const showEditModal = (user: User) => {
    setEditingUser(user);
    setIsEditModalVisible(true);
  };

  const handleEditOk = async (values: UserUpdatePayload) => {
    if (editingUser) {
      try {
        // Only send editable fields to API (role is not editable)
        const updatePayload = {
          phoneNumber: values.phoneNumber,
          fullName: values.fullName,
          address: values.address,
        };

        await adminService.updateAccount(editingUser.id, updatePayload);

        // Close modal first
        setIsEditModalVisible(false);
        setEditingUser(null);

        // Refetch users to show updated data - this will trigger the useEffect
        setLoading(true);
        const response = await accountService.getAccountList(
          currentPage,
          pageSize
        );
        setUsers(response.users || []);
        setTotalUsers(response.total);
        setLoading(false);

        console.log("✅ User updated successfully and list refreshed");
      } catch (err: any) {
        console.error("Failed to update user:", err);
        setError(err.message || "Failed to update user");
      }
    }
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingUser(null);
  };

  // Handlers for create modal
  const showCreateModal = () => {
    setIsCreateModalVisible(true);
  };

  const handleCreateOk = async (values: UserUpdatePayload) => {
    try {
      console.log("Creating user with payload:", values);
      await adminService.createAccount(values);

      // Close modal first
      setIsCreateModalVisible(false);

      // Refetch users to show new data
      setLoading(true);
      const response = await accountService.getAccountList(1, pageSize); // Use first page after create
      setUsers(response.users || []);
      setTotalUsers(response.total);
      setLoading(false);

      console.log("✅ User created successfully and list refreshed");
    } catch (err: any) {
      console.error("Failed to create user:", err);
      setError(err.message || "Failed to create user");
    }
  };

  const handleCreateCancel = () => {
    setIsCreateModalVisible(false);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await accountService.getAccountList(
          currentPage,
          pageSize
        ); // Use accountService for list
        setUsers(response.users || []); // Ensure users is always an array
        setTotalUsers(response.total);
      } catch (err: any) {
        console.error("Failed to fetch users:", err); // Log the actual error
        setError(err.message || "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentPage, pageSize]); // Depend on currentPage and pageSize for refetching

  const SortIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles["sort-icon"]}
    >
      <path d="M7 16l5 5 5-5M12 19V3" />
      <path d="M17 8l-5-5-5 5M12 5v16" />
    </svg>
  );

  const mapRoleToString = (role: number): string => {
    // Ensure role is a number
    const roleNumber = typeof role === "string" ? parseInt(role, 10) : role;

    switch (roleNumber) {
      case 0:
        return "Admin";
      case 1:
        return "Lecturer";
      case 2:
        return "Student";
      case 3:
        return "HOD";
      default:
        return `Unknown (${role})`;
    }
  };

  const totalPages = Math.ceil(totalUsers / pageSize);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Manage users</h1>
      <Button
        type="primary"
        onClick={showCreateModal}
        style={{
          marginBottom: "1rem",
          backgroundColor: "#4cbfb6",
          borderColor: "#4cbfb6",
        }}
        className={styles["rounded-button"]}
      >
        Create New User
      </Button>
      {loading && <p>Loading users...</p>}
      {error && <p className="!text-red-500">Error: {error}</p>}
      {!loading && !error && (!users || users.length === 0) && (
        <p>No users found.</p>
      )}{" "}
      {/* Added !users check */}
      {!loading && !error && users && users.length > 0 && (
        <table className={styles.table}>
          <thead className={styles["table-header"]}>
            <tr>
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
              // Ensure user.id is valid; otherwise, use index as a fallback and warn
              const key =
                user.id !== undefined && user.id !== null
                  ? user.id
                  : `fallback-${index}`;
              if (user.id === undefined || user.id === null) {
                console.warn(
                  "User object has missing or invalid ID, using fallback key for user:",
                  user
                );
              }
              return (
                <tr key={user.id} className={styles["table-row"]}>
                  <td>{(currentPage - 1) * pageSize + index + 1}</td>
                  <td>{user.email}</td>
                  <td>{user.fullName}</td>
                  <td>{new Date(user.dateOfBirth).toLocaleDateString()}</td>
                  <td>{mapRoleToString(user.role)}</td>
                  <td>{user.accountCode}</td>
                  <td>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => showEditModal(user)}
                      className={styles["rounded-button"]}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!loading && !error && users && totalUsers > pageSize && (
        <div className={styles.pagination}>
          <button onClick={prevPage} disabled={currentPage === 1}>
            Previous
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => paginate(i + 1)}
              className={currentPage === i + 1 ? styles.activePage : ""}
            >
              {i + 1}
            </button>
          ))}
          <button onClick={nextPage} disabled={currentPage === totalPages}>
            Next
          </button>
        </div>
      )}
      {isEditModalVisible && (
        <UserDetailFormModal
          visible={isEditModalVisible}
          onCancel={handleEditCancel}
          onOk={handleEditOk}
          editingUser={editingUser}
          confirmLoading={loading}
        />
      )}
      {isCreateModalVisible && (
        <UserDetailFormModal
          visible={isCreateModalVisible}
          onCancel={handleCreateCancel}
          onOk={handleCreateOk}
          editingUser={null} // No editing user for creation
          confirmLoading={loading}
        />
      )}
    </div>
  );
};

export default ManageUsersPage;
