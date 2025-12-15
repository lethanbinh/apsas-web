import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";
import { lecturerService, Lecturer } from "@/services/lecturerService";
import {
  SemesterPlanDetail,
  semesterService,
} from "@/services/semesterService";

export const useSemesterDetailData = (semesterCode: string) => {
  const [semesterData, setSemesterData] = useState<SemesterPlanDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);

  const fetchDetail = useCallback(async () => {
    if (!semesterCode) {
      setError("No semester code provided.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await semesterService.getSemesterPlanDetail(semesterCode);

      try {
        const assignRequestsResponse = await assignRequestService.getAssignRequests({
          pageNumber: 1,
          pageSize: 1000,
        });

        const statusMap = new Map<number, number>();
        const approverMap = new Map<number, number | undefined>();
        assignRequestsResponse.items.forEach(ar => {
          statusMap.set(ar.id, ar.status);
          approverMap.set(ar.id, ar.assignedApproverLecturerId);
        });

        data.semesterCourses.forEach(semesterCourse => {
          semesterCourse.assignRequests.forEach(ar => {
            const status = statusMap.get(ar.id);
            const approverId = approverMap.get(ar.id);
            if (status !== undefined) {
              (ar as any).status = status;
            }
            if (approverId !== undefined) {
              (ar as any).assignedApproverLecturerId = approverId;
            }
          });
        });
      } catch (err) {
        console.error("Failed to fetch assign requests status:", err);
      }

      setSemesterData(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to fetch semester detail:", err);
      setError(err.message || "Failed to load data.");
      setSemesterData(null);
    } finally {
      setLoading(false);
    }
  }, [semesterCode]);

  useEffect(() => {
    const fetchLecturers = async () => {
      try {
        const data = await lecturerService.getLecturerList();
        setLecturers(data);
      } catch (err) {
        console.error("Failed to fetch lecturers:", err);
      }
    };
    fetchDetail();
    fetchLecturers();
  }, [fetchDetail]);

  const allCourseElementIds = useMemo(() => {
    if (!semesterData) return new Set<number>();
    const ids = new Set<number>();
    semesterData.semesterCourses.forEach(semesterCourse => {
      semesterCourse.courseElements.forEach(element => {
        ids.add(element.id);
      });
    });
    return ids;
  }, [semesterData]);

  const { data: templatesResponse, refetch: refetchTemplates } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: allCourseElementIds.size > 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  const elementsWithAssessment = useMemo(() => {
    if (!templatesResponse?.items || allCourseElementIds.size === 0) {
      return new Set<number>();
    }

    const elementsWithAssessmentSet = new Set<number>();
    templatesResponse.items.forEach(template => {
      if (allCourseElementIds.has(template.courseElementId)) {
        elementsWithAssessmentSet.add(template.courseElementId);
      }
    });

    return elementsWithAssessmentSet;
  }, [templatesResponse, allCourseElementIds]);

  const elementsWithApprovedRequest = useMemo(() => {
    if (!semesterData) return new Set<number>();

    const elementsWithApprovedSet = new Set<number>();
    semesterData.semesterCourses.forEach(semesterCourse => {
      semesterCourse.assignRequests.forEach(assignRequest => {
        const status = (assignRequest as any).status as number | undefined;
        if (status === 5 && assignRequest.courseElement?.id) {
          elementsWithApprovedSet.add(assignRequest.courseElement.id);
        }
      });
    });

    return elementsWithApprovedSet;
  }, [semesterData]);

  return {
    semesterData,
    loading,
    error,
    lecturers,
    elementsWithAssessment,
    elementsWithApprovedRequest,
    refetchDetail: fetchDetail,
    refetchTemplates,
  };
};

