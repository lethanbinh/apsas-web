import { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

export interface UseGradingFiltersResult {

  groupSearch: string;
  setGroupSearch: (value: string) => void;
  groupDateRange: [Dayjs | null, Dayjs | null] | null;
  setGroupDateRange: (value: [Dayjs | null, Dayjs | null] | null) => void;
  filteredGradingGroups: any[];


  sessionSearch: string;
  setSessionSearch: (value: string) => void;
  selectedSessionStatus: number | undefined;
  setSelectedSessionStatus: (value: number | undefined) => void;
  selectedSessionType: number | undefined;
  setSelectedSessionType: (value: number | undefined) => void;
  sessionDateRange: [Dayjs | null, Dayjs | null] | null;
  setSessionDateRange: (value: [Dayjs | null, Dayjs | null] | null) => void;
  filteredGradingSessions: any[];


  requestSearch: string;
  setRequestSearch: (value: string) => void;
  selectedRequestStatus: number | undefined;
  setSelectedRequestStatus: (value: number | undefined) => void;
  requestDateRange: [Dayjs | null, Dayjs | null] | null;
  setRequestDateRange: (value: [Dayjs | null, Dayjs | null] | null) => void;
  filteredAssignRequests: any[];
}

export function useGradingFilters(
  gradingGroups: any[],
  gradingSessions: any[],
  assignRequests: any[]
): UseGradingFiltersResult {

  const [groupSearch, setGroupSearch] = useState("");
  const [groupDateRange, setGroupDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);


  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedSessionStatus, setSelectedSessionStatus] = useState<number | undefined>(undefined);
  const [selectedSessionType, setSelectedSessionType] = useState<number | undefined>(undefined);
  const [sessionDateRange, setSessionDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);


  const [requestSearch, setRequestSearch] = useState("");
  const [selectedRequestStatus, setSelectedRequestStatus] = useState<number | undefined>(undefined);
  const [requestDateRange, setRequestDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);


  const filteredGradingGroups = useMemo(() => {
    let filtered = [...gradingGroups];

    if (groupSearch) {
      const searchLower = groupSearch.toLowerCase();
      filtered = filtered.filter(
        (group) =>
          group.lecturerName?.toLowerCase().includes(searchLower) ||
          group.lecturerCode?.toLowerCase().includes(searchLower) ||
          group.assessmentTemplateName?.toLowerCase().includes(searchLower)
      );
    }

    if (groupDateRange && groupDateRange[0] && groupDateRange[1]) {
      filtered = filtered.filter((group) => {
        if (!group.createdAt) return false;
        const createdAt = dayjs(group.createdAt);
        const startDate = groupDateRange[0]!.startOf("day");
        const endDate = groupDateRange[1]!.endOf("day");
        return (
          (createdAt.isAfter(startDate) || createdAt.isSame(startDate)) &&
          (createdAt.isBefore(endDate) || createdAt.isSame(endDate))
        );
      });
    }

    return filtered;
  }, [gradingGroups, groupSearch, groupDateRange]);


  const filteredGradingSessions = useMemo(() => {
    let filtered = [...gradingSessions];

    if (sessionSearch) {
      const searchLower = sessionSearch.toLowerCase();
      filtered = filtered.filter(
        (session) =>
          session.submissionStudentName?.toLowerCase().includes(searchLower) ||
          session.submissionStudentCode?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedSessionStatus !== undefined) {
      filtered = filtered.filter((session) => session.status === selectedSessionStatus);
    }

    if (selectedSessionType !== undefined) {
      filtered = filtered.filter((session) => session.gradingType === selectedSessionType);
    }

    if (sessionDateRange && sessionDateRange[0] && sessionDateRange[1]) {
      filtered = filtered.filter((session) => {
        if (!session.createdAt) return false;
        const createdAt = dayjs(session.createdAt);
        const startDate = sessionDateRange[0]!.startOf("day");
        const endDate = sessionDateRange[1]!.endOf("day");
        return (
          (createdAt.isAfter(startDate) || createdAt.isSame(startDate)) &&
          (createdAt.isBefore(endDate) || createdAt.isSame(endDate))
        );
      });
    }

    return filtered;
  }, [gradingSessions, sessionSearch, selectedSessionStatus, selectedSessionType, sessionDateRange]);


  const filteredAssignRequests = useMemo(() => {
    let filtered = [...assignRequests];

    if (requestSearch) {
      const searchLower = requestSearch.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.courseElementName?.toLowerCase().includes(searchLower) ||
          request.courseName?.toLowerCase().includes(searchLower) ||
          request.assignedLecturerName?.toLowerCase().includes(searchLower) ||
          request.assignedByHODName?.toLowerCase().includes(searchLower)
      );
    }

    if (selectedRequestStatus !== undefined) {
      filtered = filtered.filter((request) => request.status === selectedRequestStatus);
    }

    if (requestDateRange && requestDateRange[0] && requestDateRange[1]) {
      filtered = filtered.filter((request) => {
        if (!request.createdAt) return false;
        const createdAt = dayjs(request.createdAt);
        const startDate = requestDateRange[0]!.startOf("day");
        const endDate = requestDateRange[1]!.endOf("day");
        return (
          (createdAt.isAfter(startDate) || createdAt.isSame(startDate)) &&
          (createdAt.isBefore(endDate) || createdAt.isSame(endDate))
        );
      });
    }

    return filtered;
  }, [assignRequests, requestSearch, selectedRequestStatus, requestDateRange]);

  return {
    groupSearch,
    setGroupSearch,
    groupDateRange,
    setGroupDateRange,
    filteredGradingGroups,
    sessionSearch,
    setSessionSearch,
    selectedSessionStatus,
    setSelectedSessionStatus,
    selectedSessionType,
    setSelectedSessionType,
    sessionDateRange,
    setSessionDateRange,
    filteredGradingSessions,
    requestSearch,
    setRequestSearch,
    selectedRequestStatus,
    setSelectedRequestStatus,
    requestDateRange,
    setRequestDateRange,
    filteredAssignRequests,
  };
}

