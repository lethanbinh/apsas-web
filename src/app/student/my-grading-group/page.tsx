"use client";

import { useAuth } from "@/hooks/useAuth";
import { useStudent } from "@/hooks/useStudent";
import { ROLES } from "@/lib/constants";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { ClassAssessment, classAssessmentService } from "@/services/classAssessmentService";
import { ClassInfo, classService } from "@/services/classService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { GradingGroup, gradingGroupService } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import { gradeItemService } from "@/services/gradeItemService";
import { assessmentFileService } from "@/services/assessmentFileService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import {
  Semester,
  SemesterPlanDetail,
  semesterService
} from "@/services/semesterService";
import { Submission, submissionService } from "@/services/submissionService";
import {
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Collapse,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import styles from "./MySubmissions.module.css";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  try {
    return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
  } catch (error) {
    return null;
  }
};

interface EnrichedSubmission extends Submission {
  courseName?: string;
  courseId?: number;
  semesterCode?: string;
  semesterEndDate?: string;
  gradingGroup?: GradingGroup;
  totalScore?: number;
}

const MySubmissionsPageContent = () => {
  const [searchText, setSearchText] = useState("");
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const queryClient = useQueryClient();

  const { user, isLoading: authLoading } = useAuth();
  const { studentId, isLoading: studentLoading } = useStudent();

  const [selectedSemester, setSelectedSemester] = useState<number | undefined>(
    undefined
  );
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(
    undefined
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(
    undefined
  );

  // Validation
  const error = useMemo(() => {
    if (authLoading || studentLoading) return null;
    if (!user || user.role !== ROLES.STUDENT) {
      return "You do not have permission to access this page.";
    }
    if (!studentId) {
      return "Student information not found for this account.";
    }
    return null;
  }, [authLoading, studentLoading, user, studentId]);

  // Fetch submissions with studentId filter (optimized)
  const { data: allSubmissionsData = [], isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['submissions', 'byStudentId', studentId],
    queryFn: () => submissionService.getSubmissionList({
      studentId: studentId!,
    }),
    enabled: !!studentId && !error,
  });

  // Filter submissions that have gradingGroupId
  const submissionsWithGradingGroup = useMemo(() => {
    return allSubmissionsData.filter((sub) => sub.gradingGroupId !== undefined);
  }, [allSubmissionsData]);

  // Get unique gradingGroupIds
  const gradingGroupIds = useMemo(() => {
    return Array.from(
      new Set(
        submissionsWithGradingGroup
          .filter((s) => s.gradingGroupId !== undefined)
          .map((s) => Number(s.gradingGroupId))
      )
    );
  }, [submissionsWithGradingGroup]);

  // Fetch grading groups in parallel
  const gradingGroupsQueries = useQueries({
    queries: gradingGroupIds.map((groupId) => ({
      queryKey: queryKeys.grading.groups.detail(groupId),
      queryFn: () => gradingGroupService.getGradingGroupById(groupId),
      enabled: gradingGroupIds.length > 0,
    })),
  });

  const gradingGroups = useMemo(() => {
    return gradingGroupsQueries
      .map((q) => q.data)
      .filter((g): g is GradingGroup => g !== undefined);
  }, [gradingGroupsQueries]);

  // Get unique assessmentTemplateIds from grading groups
  const assessmentTemplateIds = useMemo(() => {
    return Array.from(
      new Set(
        gradingGroups
          .filter((g) => g.assessmentTemplateId !== null && g.assessmentTemplateId !== undefined)
          .map((g) => Number(g.assessmentTemplateId))
      )
    );
  }, [gradingGroups]);

  // Fetch assessment templates
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

  // Get unique courseElementIds from assessment templates
  const courseElementIds = useMemo(() => {
    return Array.from(
      new Set(Object.values(assessmentTemplateMap).map((t) => t.courseElementId))
    );
  }, [assessmentTemplateMap]);

  // Fetch course elements
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

  // Map grading groups to semester codes and courses
  const gradingGroupToSemesterMap = useMemo(() => {
    const map: Record<number, string> = {};
    gradingGroups.forEach((group) => {
      if (group.assessmentTemplateId !== null && group.assessmentTemplateId !== undefined) {
        const assessmentTemplate = assessmentTemplateMap[Number(group.assessmentTemplateId)];
        if (assessmentTemplate) {
          const courseElement = courseElementMap[Number(assessmentTemplate.courseElementId)];
          if (courseElement?.semesterCourse?.semester) {
            map[group.id] = courseElement.semesterCourse.semester.semesterCode;
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
            map[group.id] = {
              courseId: courseElement.semesterCourse.course.id,
              courseName: courseElement.semesterCourse.course.name,
            };
          }
        }
      }
    });
    return map;
  }, [gradingGroups, assessmentTemplateMap, courseElementMap]);

  // Get unique semester codes from grading groups
  const semesterCodesFromGroups = useMemo(() => {
    return Array.from(new Set(Object.values(gradingGroupToSemesterMap)));
  }, [gradingGroupToSemesterMap]);

  // Fetch semesters
  const { data: allSemestersData = [] } = useQuery({
    queryKey: queryKeys.semesters.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
    enabled: !error,
  });

  // Fetch semester details only for relevant semesters
  const semesterDetailsQueries = useQueries({
    queries: semesterCodesFromGroups.map((semesterCode) => ({
      queryKey: queryKeys.semesters.detail(semesterCode),
      queryFn: () => semesterService.getSemesterPlanDetail(semesterCode),
      enabled: semesterCodesFromGroups.length > 0,
    })),
  });

  const semesters = useMemo(() => {
    return semesterDetailsQueries
      .map((q) => q.data)
      .filter((s): s is SemesterPlanDetail => s !== undefined);
  }, [semesterDetailsQueries]);

  // Fetch grading sessions for submissions (only latest, pageSize: 1)
  const gradingSessionsQueries = useQueries({
    queries: submissionsWithGradingGroup.map((submission) => ({
      queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 1 }),
      queryFn: () => gradingService.getGradingSessions({
        submissionId: submission.id,
        pageNumber: 1,
        pageSize: 1, // Only fetch latest
      }),
      enabled: submissionsWithGradingGroup.length > 0,
    })),
  });

  // Calculate total scores from grading sessions (grade is already in session)
  const submissionTotalScores = useMemo(() => {
    const map: Record<number, number> = {};
    submissionsWithGradingGroup.forEach((submission, index) => {
      const query = gradingSessionsQueries[index];
      if (query?.data?.items && query.data.items.length > 0) {
        const latestSession = query.data.items[0];
        // Use grade from session (already calculated)
        if (latestSession.grade !== undefined && latestSession.grade !== null) {
          map[submission.id] = latestSession.grade;
        }
      }
    });
    return map;
  }, [submissionsWithGradingGroup, gradingSessionsQueries]);

  // Get unique classAssessmentIds from submissions
  const classAssessmentIds = useMemo(() => {
    return Array.from(
      new Set(
        submissionsWithGradingGroup
          .filter((s) => s.classAssessmentId)
          .map((s) => s.classAssessmentId!)
      )
    );
  }, [submissionsWithGradingGroup]);

  // Fetch class assessments
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

  // Get unique classIds from class assessments
  const classIds = useMemo(() => {
    return Array.from(new Set(Object.values(classAssessments).map((ca) => ca.classId)));
  }, [classAssessments]);

  // Fetch classes in parallel
  const classesQueries = useQueries({
    queries: classIds.map((classId) => ({
      queryKey: queryKeys.classes.detail(classId.toString()),
      queryFn: () => classService.getClassById(classId.toString()),
      enabled: classIds.length > 0,
    })),
  });

  const classes = useMemo(() => {
    const map: Record<number, ClassInfo> = {};
    classesQueries.forEach((q) => {
      if (q.data) {
        map[q.data.id] = q.data;
      }
    });
    return map;
  }, [classesQueries]);

  // Calculate loading state - show loading when fetching initial data
  const loading = useMemo(() => {
    if (authLoading || studentLoading) return true;
    if (error) return false;
    
    // Show loading if we're still fetching submissions and have no data
    if (isLoadingSubmissions && submissionsWithGradingGroup.length === 0) return true;
    
    // Show loading if we have submissions but haven't fetched grading groups yet
    if (submissionsWithGradingGroup.length > 0 && gradingGroupIds.length > 0) {
      if (gradingGroupsQueries.some(q => q.isLoading) && gradingGroups.length === 0) return true;
    }
    
    // Show loading if we have grading groups but haven't fetched semester details yet
    if (gradingGroups.length > 0 && semesterCodesFromGroups.length > 0) {
      if (semesterDetailsQueries.some(q => q.isLoading) && semesters.length === 0) return true;
    }
    
    // Show loading if we have submissions but haven't fetched grading sessions yet
    if (submissionsWithGradingGroup.length > 0 && gradingSessionsQueries.length > 0) {
      if (gradingSessionsQueries.some(q => q.isLoading) && Object.keys(submissionTotalScores).length === 0) return true;
    }
    
    // Show loading if we have class assessments but haven't fetched classes yet
    if (classIds.length > 0 && classesQueries.length > 0) {
      if (classesQueries.some(q => q.isLoading) && Object.keys(classes).length === 0) return true;
    }
    
    return false;
  }, [
    authLoading, 
    studentLoading, 
    error, 
    isLoadingSubmissions, 
    submissionsWithGradingGroup.length, 
    gradingGroupIds.length,
    gradingGroupsQueries, 
    gradingGroups.length, 
    semesterCodesFromGroups.length, 
    semesterDetailsQueries, 
    semesters.length, 
    gradingSessionsQueries,
    submissionTotalScores,
    classIds.length, 
    classesQueries, 
    classes
  ]);

  // Filter grading groups: in the same semester, same assessment template, same lecturer, keep only the latest one
  const filteredGradingGroups = useMemo(() => {
    const groupedMap = new Map<string, GradingGroup>();
    
    gradingGroups.forEach((group) => {
      const semesterCode = gradingGroupToSemesterMap[group.id];
      const assessmentTemplateId = group.assessmentTemplateId;
      const lecturerId = group.lecturerId;
      
      // Skip if missing required data
      if (!semesterCode || assessmentTemplateId === null || assessmentTemplateId === undefined) {
        return;
      }
      
      const key = `${semesterCode}_${assessmentTemplateId}_${lecturerId}`;
      const existing = groupedMap.get(key);
      
      if (!existing) {
        groupedMap.set(key, group);
      } else {
        // Compare createdAt - keep the one with the latest date
        const existingDate = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
        const currentDate = group.createdAt ? new Date(group.createdAt).getTime() : 0;
        
        if (currentDate > existingDate) {
          groupedMap.set(key, group);
        }
      }
    });
    
    return Array.from(groupedMap.values());
  }, [gradingGroups, gradingGroupToSemesterMap]);

  // Get set of filtered grading group IDs for quick lookup
  const filteredGradingGroupIds = useMemo(() => {
    return new Set(filteredGradingGroups.map(g => g.id));
  }, [filteredGradingGroups]);

  const enrichedSubmissions: EnrichedSubmission[] = useMemo(() => {
    return submissionsWithGradingGroup
      .filter((sub) => {
        // Only include submissions from filtered grading groups
        return sub.gradingGroupId !== undefined && filteredGradingGroupIds.has(sub.gradingGroupId);
      })
      .map((sub) => {
        // Get semester code from grading group
        const semesterCode = sub.gradingGroupId !== undefined 
          ? gradingGroupToSemesterMap[sub.gradingGroupId] 
          : undefined;
        
        // Find semester from SemesterPlanDetail to get end date
        const semesterDetail = semesterCode ? semesters.find((s) => s.semesterCode === semesterCode) : undefined;
        const semesterEndDate = semesterDetail?.endDate;
        
        // Get class assessment for this submission
        const classAssessment = sub.classAssessmentId ? classAssessments[sub.classAssessmentId] : undefined;
        
        // Find grading group for this submission
        const gradingGroup = sub.gradingGroupId !== undefined 
          ? filteredGradingGroups.find((g) => g.id === sub.gradingGroupId)
          : undefined;

        // Get course info from grading group
        const courseInfo = sub.gradingGroupId !== undefined
          ? gradingGroupToCourseMap[sub.gradingGroupId]
          : undefined;

        // Get total score from map
        const totalScore = submissionTotalScores[sub.id];

        return {
          ...sub,
          courseName: courseInfo?.courseName || classAssessment?.courseName || "N/A",
          courseId: courseInfo?.courseId,
          semesterCode: semesterCode || undefined,
          semesterEndDate,
          gradingGroup,
          totalScore,
        };
      });
  }, [submissionsWithGradingGroup, classAssessments, semesters, filteredGradingGroups, filteredGradingGroupIds, gradingGroupToSemesterMap, gradingGroupToCourseMap, submissionTotalScores]);

  // Get available courses based on selected semester
  const availableCourses = useMemo(() => {
    if (selectedSemester === undefined) {
      // If no semester selected, return all unique courses
      const courseMap = new Map<number, { courseId: number; courseName: string }>();
      enrichedSubmissions.forEach((sub) => {
        if (sub.courseId && sub.courseName) {
          courseMap.set(sub.courseId, { courseId: sub.courseId, courseName: sub.courseName });
        }
      });
      return Array.from(courseMap.values());
    }

    const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
    const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
    if (!selectedSemesterCode) return [];

    const courseMap = new Map<number, { courseId: number; courseName: string }>();
    enrichedSubmissions.forEach((sub) => {
      if (sub.semesterCode === selectedSemesterCode && sub.courseId && sub.courseName) {
        courseMap.set(sub.courseId, { courseId: sub.courseId, courseName: sub.courseName });
      }
    });
    return Array.from(courseMap.values());
  }, [enrichedSubmissions, selectedSemester, semesters]);

  // Get available templates based on selected semester and course
  const availableTemplates = useMemo(() => {
    let filteredGroups = filteredGradingGroups;

    if (selectedSemester !== undefined) {
      const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
      const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
      if (selectedSemesterCode) {
        filteredGroups = filteredGroups.filter((g) => {
          const semesterCode = gradingGroupToSemesterMap[g.id];
          return semesterCode === selectedSemesterCode;
        });
      }
    }

    if (selectedCourseId !== undefined) {
      filteredGroups = filteredGroups.filter((g) => {
        const courseInfo = gradingGroupToCourseMap[g.id];
        return courseInfo?.courseId === selectedCourseId;
      });
    }

    return filteredGroups.map((g) => ({
      id: g.id,
      name: g.assessmentTemplateName || `Template ${g.id}`,
      assessmentTemplateId: g.assessmentTemplateId,
    }));
  }, [filteredGradingGroups, selectedSemester, selectedCourseId, semesters, gradingGroupToSemesterMap, gradingGroupToCourseMap]);

  const filteredData = useMemo(() => {
    // First, filter by semester, course, template, and search text
    let filtered = enrichedSubmissions.filter((sub) => {
      // Filter by semester - compare semesterCode from grading group
      let semesterMatch = true;
      if (selectedSemester !== undefined) {
        const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
        const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
        semesterMatch = selectedSemesterCode !== undefined && 
                       sub.semesterCode !== undefined && 
                       sub.semesterCode === selectedSemesterCode;
      }

      // Filter by course
      let courseMatch = true;
      if (selectedCourseId !== undefined) {
        courseMatch = sub.courseId === selectedCourseId;
      }

      // Filter by template (grading group)
      let templateMatch = true;
      if (selectedTemplateId !== undefined) {
        templateMatch = sub.gradingGroupId === selectedTemplateId;
      }

      // Filter by search text
      const searchMatch =
        sub.studentName.toLowerCase().includes(searchText.toLowerCase()) ||
        sub.studentCode.toLowerCase().includes(searchText.toLowerCase()) ||
        (sub.submissionFile?.name || "")
          .toLowerCase()
          .includes(searchText.toLowerCase());

      return semesterMatch && courseMatch && templateMatch && searchMatch;
    });

    // Group by (studentCode, gradingGroupId) and keep only the latest submission in each group
    const groupedMap = new Map<string, EnrichedSubmission>();
    
    filtered.forEach((sub) => {
      const studentKey = sub.studentCode || sub.studentId?.toString() || 'unknown';
      const key = `${studentKey}_${sub.gradingGroupId || 'unknown'}`;
      const existing = groupedMap.get(key);
      
      if (!existing) {
        groupedMap.set(key, sub);
      } else {
        // Compare submittedAt - keep the one with the latest date
        const existingDate = existing.submittedAt ? new Date(existing.submittedAt).getTime() : 0;
        const currentDate = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
        
        if (currentDate > existingDate) {
          groupedMap.set(key, sub);
        } else if (currentDate < existingDate) {
          // Do nothing, keep existing
        } else {
          // Dates are equal, keep the one with the largest ID (newest)
          if (sub.id > existing.id) {
            groupedMap.set(key, sub);
          }
        }
      }
    });

    // Convert map back to array and sort by submittedAt (newest first)
    const result = Array.from(groupedMap.values());
    result.sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return dateB - dateA; // Descending order (newest first)
    });

    return result;
  }, [
    enrichedSubmissions,
    searchText,
    selectedSemester,
    selectedCourseId,
    selectedTemplateId,
    semesters,
  ]);

  // Group filtered submissions by course and semester
  const groupedByCourse = useMemo(() => {
    const groupMap = new Map<string, { courseId: number; courseName: string; semesterCode: string; submissions: EnrichedSubmission[] }>();
    
    filteredData.forEach((sub) => {
      if (sub.courseId && sub.semesterCode) {
        const key = `${sub.courseId}_${sub.semesterCode}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            courseId: sub.courseId,
            courseName: sub.courseName || "N/A",
            semesterCode: sub.semesterCode,
            submissions: [],
          });
        }
        groupMap.get(key)!.submissions.push(sub);
      }
    });

    // Convert to array and sort by semester (newest first) and then by course name
    const groups = Array.from(groupMap.values());
    groups.sort((a, b) => {
      // Find semester details for comparison
      const semesterA = semesters.find((s) => s.semesterCode === a.semesterCode);
      const semesterB = semesters.find((s) => s.semesterCode === b.semesterCode);
      
      // Sort by semester end date (newest first), then by course name
      if (semesterA && semesterB) {
        const dateA = new Date(semesterA.endDate || 0).getTime();
        const dateB = new Date(semesterB.endDate || 0).getTime();
        if (dateB !== dateA) {
          return dateB - dateA; // Newest first
        }
      }
      
      // If same semester or no date, sort by course name
      return a.courseName.localeCompare(b.courseName);
    });

    return groups;
  }, [filteredData, semesters]);

  const handleViewDetail = (submission: EnrichedSubmission) => {
    localStorage.setItem("selectedSubmissionId", submission.id.toString());
    router.push(`/student/assignment-grading`);
  };

  const handleDownloadAll = async () => {
    if (groupedByCourse.length === 0) {
      messageApi.warning("No data to download");
      return;
    }

    try {
      messageApi.loading("Preparing download...", 0);
      
      // Dynamic import JSZip
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Process each group (course + semester)
      for (const group of groupedByCourse) {
        // Create folder name: CourseName_SemesterCode
        const folderName = `${group.courseName.replace(/[^a-zA-Z0-9]/g, "_")}_${group.semesterCode}`;
        const groupFolder = zip.folder(folderName);
        
        if (!groupFolder) continue;

        // Get unique grading groups for this course+semester
        const uniqueGradingGroups = new Map<number, GradingGroup>();
        group.submissions.forEach((sub) => {
          if (sub.gradingGroup && !uniqueGradingGroups.has(sub.gradingGroup.id)) {
            uniqueGradingGroups.set(sub.gradingGroup.id, sub.gradingGroup);
          }
        });

        // Generate requirement Word file for each grading group (template)
        for (const [gradingGroupId, gradingGroup] of uniqueGradingGroups) {
          if (!gradingGroup.assessmentTemplateId) continue;

          try {
            // Fetch template details
            const templateRes = await assessmentTemplateService.getAssessmentTemplates({
              pageNumber: 1,
              pageSize: 1000,
            });
            const template = templateRes.items.find(t => t.id === gradingGroup.assessmentTemplateId);
            
            if (!template) continue;

            // Fetch papers
            const papersRes = await assessmentPaperService.getAssessmentPapers({
              assessmentTemplateId: gradingGroup.assessmentTemplateId,
              pageNumber: 1,
              pageSize: 100,
            });
            const papers = papersRes.items;

            // Fetch questions and rubrics for each paper
            const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
            const rubricsMap: { [questionId: number]: RubricItem[] } = {};

            for (const paper of papers) {
              const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
                assessmentPaperId: paper.id,
                pageNumber: 1,
                pageSize: 100,
              });
              const sortedQuestions = [...questionsRes.items].sort((a, b) => 
                (a.questionNumber || 0) - (b.questionNumber || 0)
              );
              questionsMap[paper.id] = sortedQuestions;

              for (const question of sortedQuestions) {
                const rubricsRes = await rubricItemService.getRubricsForQuestion({
                  assessmentQuestionId: question.id,
                  pageNumber: 1,
                  pageSize: 100,
                });
                rubricsMap[question.id] = rubricsRes.items;
              }
            }

            // Generate Word document
            const docxModule = await import("docx");
            const { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } = docxModule;

            const docSections = [];
            docSections.push(
              new Paragraph({
                text: template.name || gradingGroup.assessmentTemplateName || "Requirement",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
              })
            );
            if (template.description) {
              docSections.push(
                new Paragraph({ text: template.description, style: "italic" })
              );
            }
            docSections.push(new Paragraph({ text: " " }));

            // Add papers, questions, and rubrics
            for (const paper of papers) {
              docSections.push(
                new Paragraph({
                  text: paper.name || `Paper ${paper.id}`,
                  heading: HeadingLevel.HEADING_1,
                })
              );
              if (paper.description) {
                docSections.push(new Paragraph({ text: paper.description }));
              }
              docSections.push(new Paragraph({ text: " " }));

              const questions = questionsMap[paper.id] || [];
              for (const [index, question] of questions.entries()) {
                docSections.push(
                  new Paragraph({
                    text: `Question ${question.questionNumber || index + 1}: ${question.questionText || ""}`,
                    heading: HeadingLevel.HEADING_2,
                  })
                );
                if (question.score) {
                  docSections.push(
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Score: ", bold: true }),
                        new TextRun(question.score.toString()),
                      ],
                    })
                  );
                }
                if (question.questionSampleInput) {
                  docSections.push(new Paragraph({ text: " " }));
                  docSections.push(
                    new Paragraph({
                      children: [new TextRun({ text: "Sample Input: ", bold: true })],
                    })
                  );
                  docSections.push(new Paragraph({ text: question.questionSampleInput }));
                }
                if (question.questionSampleOutput) {
                  docSections.push(new Paragraph({ text: " " }));
                  docSections.push(
                    new Paragraph({
                      children: [new TextRun({ text: "Sample Output: ", bold: true })],
                    })
                  );
                  docSections.push(new Paragraph({ text: question.questionSampleOutput }));
                }

                // Add rubrics
                const rubrics = rubricsMap[question.id] || [];
                if (rubrics.length > 0) {
                  docSections.push(new Paragraph({ text: " " }));
                  docSections.push(
                    new Paragraph({
                      children: [new TextRun({ text: "Rubrics: ", bold: true })],
                    })
                  );
                  for (const rubric of rubrics) {
                    docSections.push(
                      new Paragraph({
                        children: [
                          new TextRun({ text: `- ${rubric.description || ""}`, bold: false }),
                        ],
                      })
                    );
                    if (rubric.input) {
                      docSections.push(
                        new Paragraph({
                          children: [
                            new TextRun({ text: "  Input: ", bold: true }),
                            new TextRun(rubric.input),
                          ],
                        })
                      );
                    }
                    if (rubric.output) {
                      docSections.push(
                        new Paragraph({
                          children: [
                            new TextRun({ text: "  Output: ", bold: true }),
                            new TextRun(rubric.output),
                          ],
                        })
                      );
                    }
                    if (rubric.score) {
                      docSections.push(
                        new Paragraph({
                          children: [
                            new TextRun({ text: "  Score: ", bold: true }),
                            new TextRun(rubric.score.toString()),
                          ],
                        })
                      );
                    }
                  }
                }
                docSections.push(new Paragraph({ text: " " }));
              }
            }

            const doc = new Document({
              sections: [{ properties: {}, children: docSections }],
            });
            
            const wordBlob = await Packer.toBlob(doc);
            const templateName = gradingGroup.assessmentTemplateName || `Template_${gradingGroupId}`;
            const requirementFolder = groupFolder.folder(`Requirements_${templateName.replace(/[^a-zA-Z0-9]/g, "_")}`);
            if (requirementFolder) {
              requirementFolder.file(`${templateName.replace(/[^a-zA-Z0-9]/g, "_")}_Requirement.docx`, wordBlob);
            }

            // Also download requirement files if any
            try {
              const filesRes = await assessmentFileService.getFilesForTemplate({
                assessmentTemplateId: gradingGroup.assessmentTemplateId,
                pageNumber: 1,
                pageSize: 1000,
              });

              if (requirementFolder && filesRes.items.length > 0) {
                for (const file of filesRes.items) {
                  try {
                    const response = await fetch(file.fileUrl);
                    if (response.ok) {
                      const blob = await response.blob();
                      requirementFolder.file(file.name, blob);
                    }
                  } catch (err) {
                    console.error(`Failed to download requirement file ${file.name}:`, err);
                  }
                }
              }
            } catch (err) {
              console.error(`Failed to fetch requirement files:`, err);
            }
          } catch (err) {
            console.error(`Failed to generate requirement for template ${gradingGroup.assessmentTemplateId}:`, err);
          }
        }

        // Download submissions for this group
        const submissionsFolder = groupFolder.folder("Submissions");
        if (submissionsFolder) {
          for (const sub of group.submissions) {
            if (sub.submissionFile?.submissionUrl) {
              try {
                const response = await fetch(sub.submissionFile.submissionUrl, {
                  method: 'GET',
                  headers: {
                    'Accept': '*/*',
                  },
                });
                
                if (response.ok) {
                  const blob = await response.blob();
                  const fileName = `${sub.studentCode}_${sub.studentName.replace(/[^a-zA-Z0-9]/g, "_")}_${sub.submissionFile.name || `submission_${sub.id}.zip`}`;
                  submissionsFolder.file(fileName, blob);
                } else {
                  console.warn(`Failed to download submission ${sub.id}: HTTP ${response.status}`);
                  const placeholderContent = `Submission ${sub.id} - Download failed (HTTP ${response.status})`;
                  submissionsFolder.file(`submission_${sub.id}_download_failed.txt`, placeholderContent);
                }
              } catch (err) {
                console.error(`Failed to download submission ${sub.id}:`, err);
                const placeholderContent = `Submission ${sub.id} - Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
                submissionsFolder.file(`submission_${sub.id}_download_failed.txt`, placeholderContent);
              }
            } else {
              const placeholderContent = `Submission ${sub.id} - No file URL available`;
              submissionsFolder.file(`submission_${sub.id}_no_file.txt`, placeholderContent);
            }
          }
        }
      }

      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: "blob" });
      const fileSaver = (await import("file-saver")).default;
      fileSaver.saveAs(blob, `PE_Submissions_${new Date().getTime()}.zip`);

      messageApi.destroy();
      messageApi.success("Download completed successfully!");
    } catch (err: any) {
      console.error("Failed to download:", err);
      messageApi.destroy();
      messageApi.error(err.message || "Failed to download files");
    }
  };

  const columns: ColumnsType<EnrichedSubmission> = [
    {
      title: "Student Code",
      dataIndex: "studentCode",
      key: "studentCode",
    },
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
    },
    {
      title: "Submission File",
      dataIndex: "submissionFile",
      key: "fileSubmit",
      render: (file: Submission["submissionFile"]) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined />
          <span>{file?.name || "N/A"}</span>
        </div>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      render: (date: string) => {
        const vietnamTime = toVietnamTime(date);
        if (!vietnamTime || !vietnamTime.isValid()) return "N/A";
        return vietnamTime.format("DD/MM/YYYY HH:mm");
      },
      sorter: (a: EnrichedSubmission, b: EnrichedSubmission) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: "Grade",
      key: "grade",
      render: (_: any, record: EnrichedSubmission) => {
        const totalScore = record.totalScore;
        if (totalScore !== undefined && totalScore !== null) {
          return (
            <span style={{ fontWeight: 600, color: "#52c41a" }}>
              {totalScore.toFixed(2)}
            </span>
          );
        }
        return (
          <span style={{ fontWeight: 600, color: "#999" }}>
            Not graded
          </span>
        );
      },
    },
    {
      title: "Template",
      key: "template",
      render: (_: any, record: EnrichedSubmission) => (
        <span>{record.gradingGroup?.assessmentTemplateName || "N/A"}</span>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: EnrichedSubmission) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            View
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <Title
          level={2}
          style={{ margin: 0, fontWeight: 700, color: "rgb(47, 50, 125)" }}
        >
          PE - Practical Exams
        </Title>
        <Space>
          {groupedByCourse.length > 0 && (
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadAll}
              size="large"
            >
              Download All
            </Button>
          )}
        </Space>
      </div>
      <div style={{ marginBottom: 16, marginTop: 16 }}>
        <Space wrap>
          <Select
            allowClear
            value={selectedSemester}
            onChange={(value) => {
              setSelectedSemester(value);
              setSelectedCourseId(undefined);
              setSelectedTemplateId(undefined);
            }}
            style={{ width: 200 }}
            placeholder="Filter by Semester"
            options={semesters.map((s) => ({
              label: s.semesterCode,
              value: Number(s.id),
            }))}
          />
          <Select
            allowClear
            value={selectedCourseId}
            onChange={(value) => {
              setSelectedCourseId(value);
              setSelectedTemplateId(undefined);
            }}
            disabled={selectedSemester === undefined}
            style={{ width: 200 }}
            placeholder="Filter by Course"
            options={availableCourses.map((c) => ({
              label: c.courseName,
              value: c.courseId,
            }))}
          />
          <Select
            allowClear
            value={selectedTemplateId}
            onChange={(value) => {
              setSelectedTemplateId(value);
            }}
            disabled={selectedCourseId === undefined}
            style={{ width: 250 }}
            placeholder="Filter by Template"
            options={availableTemplates.map((t) => ({
              label: t.name,
              value: t.id,
            }))}
          />
          <Input
            placeholder="Search student or file..."
            prefix={<SearchOutlined />}
            style={{ width: 240 }}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Space>
      </div>

      {loading ? (
        <div className={styles.spinner}>
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
      ) : (
        <div>
          {groupedByCourse.map((group, index) => {
            const groupKey = `${group.courseId}_${group.semesterCode}_${index}`;

            return (
              <Collapse key={groupKey} style={{ marginBottom: 16 }}>
                <Collapse.Panel
                  header={
                    <span style={{ fontWeight: 600 }}>
                      {group.courseName} - {group.semesterCode} ({group.submissions.length} submissions)
                    </span>
                  }
                  key={groupKey}
                >
                  <Table
                    columns={columns}
                    dataSource={group.submissions}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    className={styles.table}
                  />
                </Collapse.Panel>
              </Collapse>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function MySubmissionsPage() {
  return (
    <App>
      <MySubmissionsPageContent />
    </App>
  );
}
