"use client";

import { accountService } from "@/services/accountService";
import { App } from "antd";
import { useState } from "react";
import { exportUsersToExcel } from "@/utils/excelUtils";
import { User } from "@/types";

export const useAccountExport = () => {
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const { notification } = App.useApp();

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

  const handleExportAllAccounts = async () => {
    try {
      setExportLoading(true);
      const allUsers = await fetchAllAccounts();

      if (!allUsers || allUsers.length === 0) {
        notification.warning({
          message: "No Data",
          description: "No accounts found to export.",
        });
        return;
      }

      exportUsersToExcel(allUsers);
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

  return {
    handleExportAllAccounts,
    exportLoading,
  };
};


