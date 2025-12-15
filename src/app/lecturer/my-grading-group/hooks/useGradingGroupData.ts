import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/lib/constants";
import { queryKeys } from "@/lib/react-query";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { AssessmentTemplate } from "@/services/assessmentTemplateService";
import { ClassAssessment, classAssessmentService } from "@/services/classAssessmentService";
import { ClassInfo, classService } from "@/services/classService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { gradingGroupService, GradingGroup } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import { lecturerService } from "@/services/lecturerService";
import {
  Semester,
  SemesterPlanDetail,
  semesterService
} from "@/services/semesterService";
import { Submission, submissionService } from "@/services/submissionService";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

export interface UseGradingGroupDataResult {
  currentLecturerId: number | null;
  error: string | null;
  gradingGroups: GradingGroup[];
  isLoadingGroups: boolean;
  allSubmissions: Submission[];
  submissionTotalScores: Record<number, number>;
  assessmentTemplateMap: Record<number, AssessmentTemplate>;
  courseElementMap: Record<number, CourseElement>;
  gradingGroupToSemesterMap: Record<number, string>;
  gradingGroupToCourseMap: Record<number, { courseId: number; courseName: string }>;
  classAssessments: Record<number, ClassAssessment>;
  classes: Record<number, ClassInfo>;
  semesters: SemesterPlanDetail[];
  allSemestersData: Semester[] | undefined;
  loading: boolean;
  setSelectedSemester: (semester: number | undefined) => void;
  selectedSemester: number | undefined;
}

export function useGradingGroupData(
  selectedSemester: number | undefined,
  setSelectedSemester: (semester: number | undefined) => void
): UseGradingGroupDataResult {
  const { user, isLoading: authLoading } = useAuth();


  const { data: lecturersData } = useQuery({
    queryKey: queryKeys.lecturers.list(),
    queryFn: () => lecturerService.getLecturerList(),
    enabled: !authLoading && !!user && user.role === ROLES.LECTURER,
  });

  const currentLecturerId = useMemo(() => {
    if (!lecturersData || !user) return null;
    const currentLecturer = lecturersData.find(
      (l) => l.accountId === user.id.toString()
    );
    return currentLecturer ? Number(currentLecturer.lecturerId) : null;
  }, [lecturersData, user]);

  const error = useMemo(() => {
    if (authLoading) return null;
    if (!user || user.role !== ROLES.LECTURER) {
      return "Bạn không có quyền truy cập trang này.";
    }
    if (currentLecturerId === null && lecturersData) {
      return "Không tìm thấy thông tin giảng viên cho tài khoản này.";
    }
    return null;
  }, [authLoading, user, currentLecturerId, lecturersData]);


  const { data: allSemestersData } = useQuery({
    queryKey: queryKeys.semesters.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => semesterService.getSemesters({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });


  const { data: gradingGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: queryKeys.grading.groups.list({ lecturerId: currentLecturerId! }),
    queryFn: () => gradingGroupService.getGradingGroups({
      lecturerId: currentLecturerId!,
    }),
    enabled: !!currentLecturerId,
  });


  const assessmentTemplateIds = useMemo(() => {
    return Array.from(
      new Set(
        gradingGroups
          .filter((g) => g.assessmentTemplateId !== null && g.assessmentTemplateId !== undefined)
          .map((g) => Number(g.assessmentTemplateId))
      )
    );
  }, [gradingGroups]);


  const { data: templatesData } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: assessmentTemplateIds.length > 0,
  });

  const assessmentTemplateMap = useMemo(() => {
    const map: Record<number, AssessmentTemplate> = {};
    if (templatesData?.items) {
      templatesData.items.forEach((template) => {
        if (assessmentTemplateIds.includes(template.id)) {
          map[template.id] = template;
        }
      });
    }
    return map;
  }, [templatesData, assessmentTemplateIds]);


  const courseElementIds = useMemo(() => {
    return Array.from(
      new Set(Object.values(assessmentTemplateMap).map((t) => t.courseElementId))
    );
  }, [assessmentTemplateMap]);


  const { data: courseElementsData } = useQuery({
    queryKey: queryKeys.courseElements.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: courseElementIds.length > 0,
  });

  const courseElementMap = useMemo(() => {
    const map: Record<number, CourseElement> = {};
    if (courseElementsData) {
      courseElementsData.forEach((element) => {
        if (courseElementIds.includes(element.id)) {
          map[element.id] = element;
        }
      });
    }
    return map;
  }, [courseElementsData, courseElementIds]);


  const gradingGroupToSemesterMap = useMemo(() => {
    const map: Record<number, string> = {};
    gradingGroups.forEach((group) => {
      if (group.assessmentTemplateId !== null && group.assessmentTemplateId !== undefined) {
        const assessmentTemplate = assessmentTemplateMap[Number(group.assessmentTemplateId)];
        if (assessmentTemplate) {
          const courseElement = courseElementMap[Number(assessmentTemplate.courseElementId)];
          if (courseElement?.semesterCourse?.semester) {
            map[Number(group.id)] = courseElement.semesterCourse.semester.semesterCode;
          }
        }
      }
    });
    return map;
  }, [gradingGroups, assessmentTemplateMap, courseElementMap]);

  const gradingGroupToCourseMap = useMemo(() => {
    const map: Record<number, { courseId: number; courseName: string }> = {};
    gradingGroups.forEach((group) => {
      if (group.assessmentTemplateId !== null && group.assessmentTemplateId !== undefined) {
        const assessmentTemplate = assessmentTemplateMap[Number(group.assessmentTemplateId)];
        if (assessmentTemplate) {
          const courseElement = courseElementMap[Number(assessmentTemplate.courseElementId)];
          if (courseElement?.semesterCourse?.course) {
            map[Number(group.id)] = {
              courseId: courseElement.semesterCourse.course.id,
              courseName: courseElement.semesterCourse.course.name,
            };
          }
        }
      }
    });
    return map;
  }, [gradingGroups, assessmentTemplateMap, courseElementMap]);


  const gradingGroupIds = gradingGroups.map(g => g.id);
  const submissionsQueries = useQueries({
    queries: gradingGroupIds.map((groupId) => ({
      queryKey: ['submissions', 'byGradingGroupId', groupId],
      queryFn: () => submissionService.getSubmissionList({
        gradingGroupId: groupId,
      }).catch(() => []),
      enabled: gradingGroupIds.length > 0,
    })),
  });

  const allSubmissions = useMemo(() => {
    return submissionsQueries
      .map(q => q.data || [])
      .flat();
  }, [submissionsQueries]);


  const gradingSessionsQueries = useQueries({
    queries: allSubmissions.map((submission) => ({
      queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 1 }),
      queryFn: () => gradingService.getGradingSessions({
        submissionId: submission.id,
        pageNumber: 1,
        pageSize: 1,
      }),
      enabled: allSubmissions.length > 0,
    })),
  });


  const submissionTotalScores = useMemo(() => {
    const scoreMap: Record<number, number> = {};
    allSubmissions.forEach((submission, index) => {
      const sessionsQuery = gradingSessionsQueries[index];
      if (sessionsQuery?.data?.items && sessionsQuery.data.items.length > 0) {

        const latestSession = sessionsQuery.data.items[0];
        if (latestSession.grade !== undefined && latestSession.grade !== null) {
          scoreMap[submission.id] = latestSession.grade;
        }
      }
    });
    return scoreMap;
  }, [allSubmissions, gradingSessionsQueries]);


  const classAssessmentIds = useMemo(() => {
    return Array.from(
      new Set(allSubmissions.filter((s) => s.classAssessmentId).map((s) => s.classAssessmentId!))
    );
  }, [allSubmissions]);

  const { data: classAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => classAssessmentService.getClassAssessments({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: classAssessmentIds.length > 0,
  });

  const classAssessments = useMemo(() => {
    const map: Record<number, ClassAssessment> = {};
    if (classAssessmentsData?.items) {
      classAssessmentsData.items.forEach((ca) => {
        if (classAssessmentIds.includes(ca.id)) {
          map[ca.id] = ca;
        }
      });
    }
    return map;
  }, [classAssessmentsData, classAssessmentIds]);


  const classIds = useMemo(() => {
    return Array.from(new Set(Object.values(classAssessments).map((ca) => ca.classId)));
  }, [classAssessments]);


  const classesQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.classes.detail(classId),
      queryFn: () => classService.getClassById(classId.toString()),
      enabled: classIds.length > 0,
    })),
  });

  const classes = useMemo(() => {
    const map: Record<number, ClassInfo> = {};
    classesQueries.forEach((query, index) => {
      if (query.data) {
        map[classIds[index]] = query.data;
      }
    });
    return map;
  }, [classesQueries, classIds]);


  const semesterCodesFromGroups = useMemo(() => {
    return Array.from(new Set(Object.values(gradingGroupToSemesterMap).filter(Boolean)));
  }, [gradingGroupToSemesterMap]);


  const semesterDetailsQueries = useQueries({
    queries: semesterCodesFromGroups.map((semesterCode) => ({
      queryKey: ['semesterPlanDetail', semesterCode],
      queryFn: () => semesterService.getSemesterPlanDetail(semesterCode),
      enabled: semesterCodesFromGroups.length > 0,
    })),
  });

  const semesters = useMemo(() => {
    const filtered = semesterDetailsQueries
      .map(q => q.data)
      .filter((s): s is SemesterPlanDetail => s !== undefined);


    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.endDate || 0).getTime();
      const dateB = new Date(b.endDate || 0).getTime();
      return dateB - dateA;
    });
  }, [semesterDetailsQueries]);


  useEffect(() => {
    if (allSemestersData && semesters.length > 0 && selectedSemester === undefined) {
      const now = new Date();

      const currentSemester = allSemestersData.find((sem: Semester) => {
        const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
        const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
        return now >= startDate && now <= endDate;
      });


      if (currentSemester) {
        const semesterDetail = semesters.find((s) => s.semesterCode === currentSemester.semesterCode);
        if (semesterDetail) {

          setSelectedSemester(Number(semesterDetail.id));
          return;
        }
      }


      const latestSemester = [...semesters].sort((a, b) => {
        const dateA = new Date(a.endDate || 0).getTime();
        const dateB = new Date(b.endDate || 0).getTime();
        return dateB - dateA;
      })[0];
      if (latestSemester) {
        setSelectedSemester(Number(latestSemester.id));
      }
    }
  }, [allSemestersData, semesters, selectedSemester, setSelectedSemester]);


  const loading = (
    isLoadingGroups ||
    (assessmentTemplateIds.length > 0 && !templatesData) ||
    (courseElementIds.length > 0 && !courseElementsData) ||
    submissionsQueries.some((q: any) => q.isLoading) ||
    gradingSessionsQueries.some((q: any) => q.isLoading) ||
    (classAssessmentIds.length > 0 && !classAssessmentsData) ||
    classesQueries.some((q: any) => q.isLoading) ||
    (semesterCodesFromGroups.length > 0 && semesterDetailsQueries.some((q: any) => q.isLoading))
  );

  return {
    currentLecturerId,
    error,
    gradingGroups,
    isLoadingGroups,
    allSubmissions,
    submissionTotalScores,
    assessmentTemplateMap,
    courseElementMap,
    gradingGroupToSemesterMap,
    gradingGroupToCourseMap,
    classAssessments,
    classes,
    semesters,
    allSemestersData,
    loading,
    setSelectedSemester,
    selectedSemester,
  };
}

