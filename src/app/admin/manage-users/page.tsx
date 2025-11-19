"use client";

import { UserDetailFormModal } from "@/components/admin/UserDetailFormModal";
import { Role } from "@/lib/constants";
import { accountService } from "@/services/accountService";
import { adminService } from "@/services/adminService";
import { CreateExaminerPayload, examinerService } from "@/services/examinerService";
import { User, UserUpdatePayload } from "@/types";
import { App, Button, Upload, Modal, Table, Space, Alert } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import styles from "./ManageUsers.module.css";

const ManageUsersPageContent: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] =
    useState<boolean>(false);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [importResultVisible, setImportResultVisible] = useState<boolean>(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; accountCode?: string; email?: string; error: string }>;
  }>({ success: 0, failed: 0, errors: [] });

  const { modal, notification } = App.useApp();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountService.getAccountList(
        currentPage,
        pageSize
      );
      setUsers(response.users || []);
      setTotalUsers(response.total);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showEditModal = (user: User) => {
    setEditingUser(user);
    setIsEditModalVisible(true);
  };

  const handleEditOk = async (
    values: UserUpdatePayload | CreateExaminerPayload,
    role: Role
  ) => {
    if (editingUser) {
      try {
        setLoading(true);
        const updatePayload = {
          phoneNumber: (values as UserUpdatePayload).phoneNumber,
          fullName: (values as UserUpdatePayload).fullName,
          address: (values as UserUpdatePayload).address,
        };

        await adminService.updateAccount(editingUser.id, updatePayload);

        setIsEditModalVisible(false);
        setEditingUser(null);
        notification.success({ message: "User updated successfully" });
        fetchUsers();
      } catch (err: any) {
        console.error("Failed to update user:", err);
        setError(err.message || "Failed to update user");
        setLoading(false);
      }
    }
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    setEditingUser(null);
  };

  const showCreateModal = () => {
    setIsCreateModalVisible(true);
  };

  const handleCreateOk = async (
    values: UserUpdatePayload | CreateExaminerPayload,
    role: Role
  ) => {
    try {
      setLoading(true);
      if (role === 4) {
        await examinerService.createExaminer(values as CreateExaminerPayload);
      } else {
        await adminService.createAccount(values as UserUpdatePayload);
      }

      setIsCreateModalVisible(false);
      notification.success({ message: "User created successfully" });
      fetchUsers();
    } catch (err: any) {
      console.error("Failed to create user:", err);
      setError(err.message || "Failed to create user");
      setLoading(false);
    }
  };

  const handleCreateCancel = () => {
    setIsCreateModalVisible(false);
  };

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
      case 4:
        return "Examiner";
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

  // Download template with 50 sample accounts
  const handleDownloadSampleTemplate = () => {
    try {
      const sampleAccounts = [];
      const roles = [
        { value: "0", name: "Admin" },
        { value: "1", name: "Lecturer" },
        { value: "2", name: "Student" },
        { value: "3", name: "HOD" },
        { value: "4", name: "Examiner" }
      ];
      const genders = ["0", "1", "2"]; // Male, Female, Other
      const firstNames = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Vo", "Dang", "Bui", "Do"];
      const middleNames = ["Van", "Thi", "Duc", "Minh", "Thanh", "Quang", "Duy", "Hoang", "Tuan", "Anh"];
      const lastNames = ["An", "Binh", "Chi", "Dung", "Em", "Giang", "Hoa", "Khanh", "Linh", "Mai", "Nam", "Oanh", "Phuong", "Quan", "Son", "Thao", "Uyen", "Vy", "Xuan", "Yen"];
      const addresses = [
        "123 Le Loi Street, District 1, Ho Chi Minh City",
        "456 Nguyen Hue Boulevard, District 1, Ho Chi Minh City",
        "789 Tran Hung Dao Street, District 5, Ho Chi Minh City",
        "321 Vo Van Tan Street, District 3, Ho Chi Minh City",
        "654 Ly Tu Trong Street, District 1, Ho Chi Minh City",
        "987 Pasteur Street, District 3, Ho Chi Minh City",
        "147 Dong Khoi Street, District 1, Ho Chi Minh City",
        "258 Hai Ba Trung Street, District 3, Ho Chi Minh City",
        "369 Nguyen Dinh Chieu Street, District 3, Ho Chi Minh City",
        "741 Cach Mang Thang Tam Street, District 10, Ho Chi Minh City"
      ];

      for (let i = 1; i <= 50; i++) {
        const roleIndex = Math.floor((i - 1) / 10); // Distribute roles: 10 each
        const role = roles[roleIndex % roles.length];
        const gender = genders[Math.floor(Math.random() * genders.length)];
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const fullName = `${firstName} ${middleName} ${lastName}`;
        const accountCode = `ACC${String(i).padStart(3, "0")}`;
        const username = `user${String(i).padStart(3, "0")}`;
        const email = `user${String(i).padStart(3, "0")}@example.com`;
        const phoneNumber = `0${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 10000000).toString().padStart(8, "0")}`;
        const address = addresses[Math.floor(Math.random() * addresses.length)];
        
        // Generate date of birth between 1990 and 2005
        const year = 1990 + Math.floor(Math.random() * 16);
        const month = Math.floor(Math.random() * 12) + 1;
        const day = Math.floor(Math.random() * 28) + 1;
        const dateOfBirth = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        
        const avatarUrl = i % 3 === 0 ? `https://example.com/avatar${i}.jpg` : "";
        const password = `Pass${i}@123`;

        sampleAccounts.push({
          "Account Code": accountCode,
          "Username": username,
          "Email": email,
          "Phone Number": phoneNumber,
          "Full Name": fullName,
          "Avatar URL": avatarUrl,
          "Address": address,
          "Gender": gender,
          "Date of Birth": dateOfBirth,
          "Role": role.value,
          "Password": password
        });
      }

      const ws = XLSX.utils.json_to_sheet(sampleAccounts);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Accounts");

      // Set column widths
      ws["!cols"] = [
        { wch: 15 }, // Account Code
        { wch: 15 }, // Username
        { wch: 25 }, // Email
        { wch: 15 }, // Phone Number
        { wch: 20 }, // Full Name
        { wch: 30 }, // Avatar URL
        { wch: 40 }, // Address
        { wch: 10 }, // Gender
        { wch: 15 }, // Date of Birth
        { wch: 10 }, // Role
        { wch: 15 }, // Password
      ];

      XLSX.writeFile(wb, "Account_Import_Template.xlsx");
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

  // Validate account data
  const validateAccountData = (row: any, rowIndex: number): string | null => {
    const rowNum = rowIndex + 2; // +2 because Excel rows start at 1 and we have header

    // Required fields
    if (!row["Account Code"] || !row["Account Code"].toString().trim()) {
      return `Row ${rowNum}: Account Code is required`;
    }
    if (!row["Username"] || !row["Username"].toString().trim()) {
      return `Row ${rowNum}: Username is required`;
    }
    if (row["Username"].toString().trim().length < 3) {
      return `Row ${rowNum}: Username must be at least 3 characters`;
    }
    if (!row["Email"] || !row["Email"].toString().trim()) {
      return `Row ${rowNum}: Email is required`;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row["Email"].toString().trim())) {
      return `Row ${rowNum}: Invalid email format`;
    }
    if (!row["Phone Number"] || !row["Phone Number"].toString().trim()) {
      return `Row ${rowNum}: Phone Number is required`;
    }
    const phoneRegex = /^[0-9]{10,}$/;
    const phoneDigits = row["Phone Number"].toString().replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(phoneDigits)) {
      return `Row ${rowNum}: Phone Number must be at least 10 digits`;
    }
    if (!row["Full Name"] || !row["Full Name"].toString().trim()) {
      return `Row ${rowNum}: Full Name is required`;
    }
    if (row["Full Name"].toString().trim().length < 2) {
      return `Row ${rowNum}: Full Name must be at least 2 characters`;
    }
    if (!row["Address"] || !row["Address"].toString().trim()) {
      return `Row ${rowNum}: Address is required`;
    }
    if (row["Address"].toString().trim().length < 5) {
      return `Row ${rowNum}: Address must be at least 5 characters`;
    }
    if (row["Gender"] === undefined || row["Gender"] === null || row["Gender"].toString().trim() === "") {
      return `Row ${rowNum}: Gender is required (0=Male, 1=Female, 2=Other)`;
    }
    const gender = parseInt(row["Gender"].toString().trim());
    if (isNaN(gender) || gender < 0 || gender > 2) {
      return `Row ${rowNum}: Gender must be 0 (Male), 1 (Female), or 2 (Other)`;
    }
    if (!row["Date of Birth"] || !row["Date of Birth"].toString().trim()) {
      return `Row ${rowNum}: Date of Birth is required (format: YYYY-MM-DD)`;
    }
    const dateOfBirth = new Date(row["Date of Birth"].toString().trim());
    if (isNaN(dateOfBirth.getTime())) {
      return `Row ${rowNum}: Invalid Date of Birth format (use YYYY-MM-DD)`;
    }
    if (!row["Role"] || row["Role"].toString().trim() === "") {
      return `Row ${rowNum}: Role is required (0=Admin, 1=Lecturer, 2=Student, 3=HOD, 4=Examiner)`;
    }
    const role = parseInt(row["Role"].toString().trim());
    if (isNaN(role) || role < 0 || role > 4) {
      return `Row ${rowNum}: Role must be 0-4 (0=Admin, 1=Lecturer, 2=Student, 3=HOD, 4=Examiner)`;
    }
    if (!row["Password"] || !row["Password"].toString().trim()) {
      return `Row ${rowNum}: Password is required`;
    }
    if (row["Password"].toString().trim().length < 6) {
      return `Row ${rowNum}: Password must be at least 6 characters`;
    }
    // Optional: Avatar URL validation
    if (row["Avatar URL"] && row["Avatar URL"].toString().trim()) {
      try {
        new URL(row["Avatar URL"].toString().trim());
      } catch {
        return `Row ${rowNum}: Invalid Avatar URL format`;
      }
    }

    return null;
  };

  // Parse Excel file
  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(new Error("Failed to parse Excel file. Please check the file format."));
        }
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file."));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Import accounts
  const handleImportAccounts = async (file: File) => {
    try {
      setImportLoading(true);
      const data = await parseExcelFile(file);
      
      if (!data || data.length === 0) {
        notification.error({
          message: "Import Failed",
          description: "Excel file is empty or invalid.",
        });
        setImportLoading(false);
        return;
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ row: number; accountCode?: string; email?: string; error: string }>,
      };

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // +2 because Excel rows start at 1 and we have header

        // Validate row
        const validationError = validateAccountData(row, i);
        if (validationError) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            accountCode: row["Account Code"]?.toString(),
            email: row["Email"]?.toString(),
            error: validationError,
          });
          continue;
        }

        // Prepare account data
        const accountData: any = {
          accountCode: row["Account Code"].toString().trim(),
          username: row["Username"].toString().trim(),
          email: row["Email"].toString().trim(),
          phoneNumber: row["Phone Number"].toString().trim(),
          fullName: row["Full Name"].toString().trim(),
          address: row["Address"].toString().trim(),
          gender: parseInt(row["Gender"].toString().trim()),
          dateOfBirth: new Date(row["Date of Birth"].toString().trim()).toISOString(),
          role: parseInt(row["Role"].toString().trim()),
          password: row["Password"].toString().trim(),
        };

        if (row["Avatar URL"] && row["Avatar URL"].toString().trim()) {
          accountData.avatar = row["Avatar URL"].toString().trim();
        }

        // Create account
        try {
          if (accountData.role === 4) {
            // Examiner
            const examinerPayload: CreateExaminerPayload = {
              ...accountData,
              role: "teacher",
            };
            await examinerService.createExaminer(examinerPayload);
          } else {
            await adminService.createAccount(accountData);
          }
          results.success++;
        } catch (error: any) {
          results.failed++;
          const errorMessage = error.response?.data?.errorMessages?.[0] || 
                              error.message || 
                              "Failed to create account";
          results.errors.push({
            row: rowNum,
            accountCode: accountData.accountCode,
            email: accountData.email,
            error: errorMessage,
          });
        }
      }

      setImportResults(results);
      setImportResultVisible(true);
      
      if (results.success > 0) {
        notification.success({
          message: "Import Completed",
          description: `Successfully created ${results.success} account(s). ${results.failed > 0 ? `${results.failed} account(s) failed.` : ""}`,
        });
        fetchUsers(); // Refresh user list
      } else {
        notification.error({
          message: "Import Failed",
          description: `All ${results.failed} account(s) failed to import. Please check the errors.`,
        });
      }
    } catch (error: any) {
      console.error("Import error:", error);
      notification.error({
        message: "Import Failed",
        description: error.message || "Failed to import accounts. Please check the file format.",
      });
    } finally {
      setImportLoading(false);
    }
  };

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
      handleImportAccounts(file);
      return false; // Prevent auto upload
    },
    showUploadList: false,
    maxCount: 1,
  };

  const importResultColumns = [
    {
      title: "Row",
      dataIndex: "row",
      key: "row",
      width: 80,
    },
    {
      title: "Account Code",
      dataIndex: "accountCode",
      key: "accountCode",
      width: 120,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
    },
    {
      title: "Error",
      dataIndex: "error",
      key: "error",
      ellipsis: true,
    },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Manage users</h1>
      <Space style={{ marginBottom: "1rem" }} wrap>
        <Button
          type="primary"
          onClick={showCreateModal}
          style={{
            backgroundColor: "#4cbfb6",
            borderColor: "#4cbfb6",
          }}
          className={styles["rounded-button"]}
        >
          Create New User
        </Button>
        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadSampleTemplate}
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
      {loading && <p>Loading users...</p>}
      {error && <p className="!text-red-500">Error: {error}</p>}
      {!loading && !error && (!users || users.length === 0) && (
        <p>No users found.</p>
      )}
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
          editingUser={null}
          confirmLoading={loading}
        />
      )}
      <Modal
        title="Import Results"
        open={importResultVisible}
        onCancel={() => setImportResultVisible(false)}
        footer={[
          <Button key="close" onClick={() => setImportResultVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Alert
            message={`Import Summary: ${importResults.success} successful, ${importResults.failed} failed`}
            type={importResults.failed === 0 ? "success" : "warning"}
            showIcon
          />
          {importResults.errors.length > 0 && (
            <div>
              <h4>Errors:</h4>
              <Table
                columns={importResultColumns}
                dataSource={importResults.errors.map((err, idx) => ({ ...err, key: idx }))}
                pagination={{ pageSize: 10 }}
                scroll={{ y: 300 }}
                size="small"
              />
            </div>
          )}
        </Space>
      </Modal>
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
