"use client";

import { CreateUserFormModal } from "@/components/admin/CreateUserFormModal";
import { Role, ROLES } from "@/lib/constants";
import { accountService } from "@/services/accountService";
import { adminService } from "@/services/adminService";
import { lecturerService } from "@/services/lecturerService";
import { studentManagementService } from "@/services/studentManagementService";
import { examinerService } from "@/services/examinerService";
import { User, UserUpdatePayload } from "@/types";
import { App, Button, Upload, Modal, Table, Space, Alert, Input, Spin } from "antd";
import { DownloadOutlined, UploadOutlined, FileExcelOutlined, SearchOutlined, EditOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import styles from "./ManageUsers.module.css";
import { queryKeys } from "@/lib/react-query";

const ManageUsersPageContent: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] =
    useState<boolean>(false);
  const [importResultVisible, setImportResultVisible] = useState<boolean>(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; accountCode?: string; email?: string; error: string }>;
  }>({ success: 0, failed: 0, errors: [] });
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { modal, notification } = App.useApp();

  // Fetch users using TanStack Query
  const { data: usersResponse, isLoading: loading, error: queryError } = useQuery({
    queryKey: queryKeys.users.list({ page: currentPage, pageSize }),
    queryFn: () => accountService.getAccountList(currentPage, pageSize),
  });

  const users = usersResponse?.users || [];
  const totalUsers = usersResponse?.total || 0;
  const error = queryError ? (queryError as any).message || "Failed to fetch users" : null;

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) {
      return users;
    }
    const searchLower = searchTerm.toLowerCase().trim();
    return users.filter(user => 
      user.email?.toLowerCase().includes(searchLower) ||
      user.fullName?.toLowerCase().includes(searchLower) ||
      user.accountCode?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.phoneNumber?.toLowerCase().includes(searchLower)
    );
  }, [users, searchTerm]);

  const showEditModal = (user: User) => {
    setEditingUser(user);
    setIsEditModalVisible(true);
  };

  // Mutation for updating user
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, payload }: { userId: number; payload: UserUpdatePayload }) => {
      return adminService.updateAccount(userId, payload);
    },
    onSuccess: () => {
      // Invalidate users queries to refetch updated data
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

  const handleEditOk = async (
    values: UserUpdatePayload,
    role: Role
  ) => {
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

  const showCreateModal = () => {
    setIsCreateModalVisible(true);
  };

  // Mutation for creating user
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
      // Invalidate users queries to refetch updated data
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

  const handleCreateOk = async (
    values: any,
    role: Role
  ) => {
    createUserMutation.mutate({ payload: values, role });
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
      case ROLES.ADMIN:
        return "Admin";
      case ROLES.LECTURER:
        return "Lecturer";
      case ROLES.STUDENT:
        return "Student";
      case ROLES.HOD:
        return "HOD";
      case ROLES.EXAMINER:
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

  // Generate pagination items (max 6 pages, with ellipsis for remaining)
  const getPaginationItems = (): (number | string)[] => {
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const items: (number | string)[] = [];
    
    if (currentPage <= 4) {
      // Show: 1, 2, 3, 4, 5, 6, ..., totalPages
      for (let i = 1; i <= 6; i++) {
        items.push(i);
      }
      items.push('...');
      items.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      // Show: 1, ..., totalPages-5, totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
      items.push(1);
      items.push('...');
      for (let i = totalPages - 5; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      // Show: 1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages
      items.push(1);
      items.push('...');
      items.push(currentPage - 1);
      items.push(currentPage);
      items.push(currentPage + 1);
      items.push('...');
      items.push(totalPages);
    }

    return items;
  };

  // Fetch all accounts for export
  const fetchAllAccounts = async (): Promise<User[]> => {
    const allUsers: User[] = [];
    let currentPage = 1;
    const pageSize = 100; // Use large page size to minimize requests
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await accountService.getAccountList(currentPage, pageSize);
        if (response.users && response.users.length > 0) {
          allUsers.push(...response.users);
          // Check if there are more pages
          if (allUsers.length >= response.total) {
            hasMore = false;
          } else {
            currentPage++;
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error("Error fetching accounts for export:", error);
        throw error;
      }
    }

    return allUsers;
  };

  // Export all accounts to Excel
  const handleExportAllAccounts = async () => {
    try {
      setExportLoading(true);
      // Fetch all accounts
      const allUsers: User[] = [];
      let currentPage = 1;
      const pageSize = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await accountService.getAccountList(currentPage, pageSize);
        if (response.users && response.users.length > 0) {
          allUsers.push(...response.users);
          if (allUsers.length >= response.total) {
            hasMore = false;
          } else {
            currentPage++;
          }
        } else {
          hasMore = false;
        }
      }

      if (!allUsers || allUsers.length === 0) {
        notification.warning({
          message: "No Data",
          description: "No accounts found to export.",
        });
        return;
      }

      // Map users to Excel format
      const excelData = allUsers.map((user, index) => {
        const roleMap: Record<number, string> = {
          [ROLES.ADMIN]: "Admin",
          [ROLES.LECTURER]: "Lecturer",
          [ROLES.STUDENT]: "Student",
          [ROLES.HOD]: "HOD",
          [ROLES.EXAMINER]: "Examiner",
        };

        const genderMap: Record<number, string> = {
          0: "Male",
          1: "Female",
          2: "Other",
        };

        return {
          "No": index + 1,
          "Account Code": user.accountCode || "",
          "Username": user.username || "",
          "Email": user.email || "",
          "Phone Number": user.phoneNumber || "",
          "Full Name": user.fullName || "",
          "Address": user.address || "",
          "Gender": user.gender !== undefined ? genderMap[user.gender] || user.gender.toString() : "",
          "Date of Birth": user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
          "Role": roleMap[user.role] || user.role.toString(),
        };
      });

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "All Accounts");

      // Set column widths
      ws["!cols"] = [
        { wch: 8 },  // No
        { wch: 15 }, // Account Code
        { wch: 15 }, // Username
        { wch: 25 }, // Email
        { wch: 15 }, // Phone Number
        { wch: 20 }, // Full Name
        { wch: 40 }, // Address
        { wch: 10 }, // Gender
        { wch: 15 }, // Date of Birth
        { wch: 12 }, // Role
      ];

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const filename = `All_Accounts_${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
      notification.success({
        message: "Export Successful",
        description: `Successfully exported ${allUsers.length} account(s) to Excel.`,
      });
    } catch (error: any) {
      console.error("Failed to export accounts:", error);
      notification.error({
        message: "Export Failed",
        description: error.message || "Failed to export accounts. Please try again.",
      });
    } finally {
      setExportLoading(false);
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
        { value: "4", name: "Examiner" },
      ];
      const genders = ["0", "1"]; // Male, Female
      const departments = ["Computer Science", "Information Technology", "Software Engineering", "Data Science", "Cybersecurity", "Network Engineering", "Artificial Intelligence", "Web Development", "Mobile Development", "Database Systems"];
      const specializations = ["Web Development", "Mobile Development", "Data Science", "Machine Learning", "Cybersecurity", "Cloud Computing", "Database Management", "Software Architecture", "Network Security", "AI & Robotics"];
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
        
        const password = `Pass${i}@123`;

        const accountData: any = {
          "Username": username,
          "Email": email,
          "Phone Number": phoneNumber,
          "Full Name": fullName,
          "Address": address,
          "Gender": gender,
          "Date of Birth": dateOfBirth,
          "Role": role.value,
          "Password": password
        };

        // Add Department and Specialization for Lecturer role
        if (role.value === "1") {
          accountData["Department"] = departments[Math.floor(Math.random() * departments.length)];
          accountData["Specialization"] = specializations[Math.floor(Math.random() * specializations.length)];
        }

        sampleAccounts.push(accountData);
      }

      const ws = XLSX.utils.json_to_sheet(sampleAccounts);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Accounts");

      // Set column widths
      ws["!cols"] = [
        { wch: 15 }, // Username
        { wch: 25 }, // Email
        { wch: 15 }, // Phone Number
        { wch: 20 }, // Full Name
        { wch: 40 }, // Address
        { wch: 10 }, // Gender
        { wch: 15 }, // Date of Birth
        { wch: 10 }, // Role
        { wch: 15 }, // Password
        { wch: 20 }, // Department (for Lecturer)
        { wch: 20 }, // Specialization (for Lecturer)
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
      return `Row ${rowNum}: Gender is required (0=Male, 1=Female)`;
    }
    const gender = parseInt(row["Gender"].toString().trim());
    if (isNaN(gender) || gender < 0 || gender > 1) {
      return `Row ${rowNum}: Gender must be 0 (Male) or 1 (Female)`;
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
    // Validate Lecturer-specific fields
    if (role === ROLES.LECTURER) {
      if (!row["Department"] || !row["Department"].toString().trim()) {
        return `Row ${rowNum}: Department is required for Lecturer role`;
      }
      if (!row["Specialization"] || !row["Specialization"].toString().trim()) {
        return `Row ${rowNum}: Specialization is required for Lecturer role`;
      }
    }
    // Validate Lecturer-specific fields
    if (role === ROLES.LECTURER) {
      if (!row["Department"] || !row["Department"].toString().trim()) {
        return `Row ${rowNum}: Department is required for Lecturer role`;
      }
      if (!row["Specialization"] || !row["Specialization"].toString().trim()) {
        return `Row ${rowNum}: Specialization is required for Lecturer role`;
      }
    }
    if (!row["Password"] || !row["Password"].toString().trim()) {
      return `Row ${rowNum}: Password is required`;
    }
    if (row["Password"].toString().trim().length < 6) {
      return `Row ${rowNum}: Password must be at least 6 characters`;
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

  // Mutation for importing accounts
  const importAccountsMutation = useMutation({
    mutationFn: async (file: File) => {
      const data = await parseExcelFile(file);
      
      if (!data || data.length === 0) {
        throw new Error("Excel file is empty or invalid.");
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ row: number; email?: string; error: string }>,
      };

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2;

        // Validate row
        const validationError = validateAccountData(row, i);
        if (validationError) {
          results.failed++;
          results.errors.push({
            row: rowNum,
            email: row["Email"]?.toString(),
            error: validationError,
          });
          continue;
        }

        // Prepare account data
        const role = parseInt(row["Role"].toString().trim());
        const baseData: any = {
          username: row["Username"].toString().trim(),
          email: row["Email"].toString().trim(),
          phoneNumber: row["Phone Number"].toString().trim(),
          fullName: row["Full Name"].toString().trim(),
          address: row["Address"].toString().trim(),
          gender: parseInt(row["Gender"].toString().trim()),
          dateOfBirth: new Date(row["Date of Birth"].toString().trim()).toISOString(),
          password: row["Password"].toString().trim(),
          avatar: row["Avatar"]?.toString().trim() || "",
        };

        // Add role-specific fields
        let accountData: any = { ...baseData };
        if (role === ROLES.LECTURER) {
          accountData.department = row["Department"]?.toString().trim() || "";
          accountData.specialization = row["Specialization"]?.toString().trim() || "";
        }

        // Create account using the appropriate service
        try {
          switch (role) {
            case ROLES.ADMIN:
              await adminService.createAdmin(accountData);
              break;
            case ROLES.LECTURER:
              await lecturerService.createLecturer(accountData);
              break;
            case ROLES.STUDENT:
              await studentManagementService.createStudent(accountData);
              break;
            case ROLES.HOD:
              await adminService.createHOD(accountData);
              break;
            case ROLES.EXAMINER:
              await examinerService.createExaminer(accountData);
              break;
            default:
              throw new Error(`Invalid role: ${role}`);
          }
          results.success++;
        } catch (error: any) {
          results.failed++;
          const errorMessage = error.response?.data?.errorMessages?.[0] || 
                              error.message || 
                              "Failed to create account";
          results.errors.push({
            row: rowNum,
            email: accountData.email,
            error: errorMessage,
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      // Invalidate users queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      
      setImportResults(results);
      setImportResultVisible(true);
      
      if (results.success > 0) {
        notification.success({
          message: "Import Completed",
          description: `Successfully created ${results.success} account(s). ${results.failed > 0 ? `${results.failed} account(s) failed.` : ""}`,
        });
      } else {
        notification.error({
          message: "Import Failed",
          description: `All ${results.failed} account(s) failed to import. Please check the errors.`,
        });
      }
    },
    onError: (error: any) => {
      console.error("Import error:", error);
      notification.error({
        message: "Import Failed",
        description: error.message || "Failed to import accounts. Please check the file format.",
      });
    },
  });

  // Import accounts
  const handleImportAccounts = async (file: File) => {
    importAccountsMutation.mutate(file);
  };

  const importLoading = importAccountsMutation.isPending;

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
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <Input
          placeholder="Search by email, name, account code, username, or phone number..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          style={{ maxWidth: "500px", flex: "1", minWidth: "300px" }}
        />
        <Space wrap>
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
            icon={<FileExcelOutlined />}
            onClick={handleExportAllAccounts}
            loading={exportLoading}
            className={styles["rounded-button"]}
          >
            Export All Accounts
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
      </div>
      {loading && !users ? (
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
      ) : !loading && !error && searchTerm && filteredUsers.length === 0 ? (
        <p>No users found matching your search.</p>
      ) : !loading && !error && !searchTerm && (!users || users.length === 0) ? (
        <p>No users found.</p>
      ) : (
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
            {(searchTerm ? filteredUsers : users).map((user, index) => {
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
                <tr 
                  key={user.id} 
                  className={styles["table-row"]}
                  onClick={() => showEditModal(user)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{(currentPage - 1) * pageSize + index + 1}</td>
                  <td>{user.email}</td>
                  <td>{user.fullName}</td>
                  <td>{new Date(user.dateOfBirth).toLocaleDateString()}</td>
                  <td>{mapRoleToString(user.role)}</td>
                  <td>{user.accountCode}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => showEditModal(user)}
                      className={styles["rounded-button"]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {!loading && !error && !searchTerm && users && totalUsers > pageSize && (
        <div className={styles.pagination}>
          <button onClick={prevPage} disabled={currentPage === 1}>
            Previous
          </button>
          {getPaginationItems().map((item, index) => {
            if (item === '...') {
              return (
                <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                  ...
                </span>
              );
            }
            return (
              <button
                key={item}
                onClick={() => paginate(item as number)}
                className={currentPage === item ? styles.activePage : ""}
              >
                {item}
              </button>
            );
          })}
          <button onClick={nextPage} disabled={currentPage === totalPages}>
            Next
          </button>
        </div>
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
