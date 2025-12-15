import { adminService } from "@/services/adminService";
import { gradingGroupService } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import { useEffect, useState } from "react";

export interface UseGradingDataResult {
  gradingGroups: any[];
  gradingSessions: any[];
  assignRequests: any[];
  gradingGroupsLoading: boolean;
  sessionsLoading: boolean;
  requestsLoading: boolean;
  fetchData: () => Promise<void>;
}

export function useGradingData(): UseGradingDataResult {
  const [gradingGroups, setGradingGroups] = useState<any[]>([]);
  const [gradingSessions, setGradingSessions] = useState<any[]>([]);
  const [assignRequests, setAssignRequests] = useState<any[]>([]);
  const [gradingGroupsLoading, setGradingGroupsLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const fetchData = async () => {
    try {
      setGradingGroupsLoading(true);
      setSessionsLoading(true);
      setRequestsLoading(true);

      const [groupsData, sessionsData, requestsData] = await Promise.all([
        gradingGroupService.getGradingGroups({}),
        gradingService.getGradingSessions({ pageNumber: 1, pageSize: 1000 }),
        adminService.getApprovalList(1, 1000),
      ]);

      setGradingGroups(groupsData);
      setGradingSessions(sessionsData.items);
      setAssignRequests(requestsData.items);
    } catch (error) {
      console.error("Error fetching grading data:", error);
    } finally {
      setGradingGroupsLoading(false);
      setSessionsLoading(false);
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    gradingGroups,
    gradingSessions,
    assignRequests,
    gradingGroupsLoading,
    sessionsLoading,
    requestsLoading,
    fetchData,
  };
}

