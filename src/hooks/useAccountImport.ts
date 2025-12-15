"use client";

import { ROLES } from "@/lib/constants";
import { queryKeys } from "@/lib/react-query";
import { adminService } from "@/services/adminService";
import { examinerService } from "@/services/examinerService";
import { lecturerService } from "@/services/lecturerService";
import { studentManagementService } from "@/services/studentManagementService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { parseExcelFile, validateAccountData } from "@/utils/excelUtils";

interface ImportError {
  row: number;
  email?: string;
  error: string;
}

interface ImportResults {
  success: number;
  failed: number;
  errors: ImportError[];
}

export const useAccountImport = () => {
  const queryClient = useQueryClient();
  const { notification } = App.useApp();

  const importAccountsMutation = useMutation({
    mutationFn: async (file: File): Promise<ImportResults> => {
      const data = await parseExcelFile(file);

      if (!data || data.length === 0) {
        throw new Error("Excel file is empty or invalid.");
      }

      const results: ImportResults = {
        success: 0,
        failed: 0,
        errors: [],
      };


      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2;


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


        let accountData: any = { ...baseData };
        if (role === ROLES.LECTURER) {
          accountData.department = row["Department"]?.toString().trim() || "";
          accountData.specialization = row["Specialization"]?.toString().trim() || "";
        }


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
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

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

  return {
    importAccounts: importAccountsMutation.mutateAsync,
    importLoading: importAccountsMutation.isPending,
  };
};

