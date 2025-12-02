"use client";

import { useAuth } from "@/hooks/useAuth";
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
import { lecturerService } from "@/services/lecturerService";
import { assessmentFileService } from "@/services/assessmentFileService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import {
  Semester,
  SemesterPlanDetail,
  semesterService
} from "@/services/semesterService";
import { Submission, submissionService } from "@/services/submissionService";
import { exportGradeReportToExcel, GradeReportData } from "@/utils/exportGradeReport";
import {
  DownloadOutlined,
  FileTextOutlined,
  RobotOutlined,
  SearchOutlined,
  UploadOutlined,
  FileExcelOutlined,
  EditOutlined
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Divider,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Upload
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import styles from "./MySubmissions.module.css";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";

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

const formatUtcDate = (dateString: string | null | undefined, formatStr: string) => {
  if (!dateString) return "N/A";
  const vietnamTime = toVietnamTime(dateString);
  if (!vietnamTime || !vietnamTime.isValid()) return "N/A";
  return vietnamTime.format(formatStr);
};

const getStatusTag = (status: number) => {
  switch (status) {
    case 0:
      return <Tag color="default">Not graded</Tag>;
    case 1:
      return <Tag color="processing">Grading</Tag>;
    case 2:
      return <Tag color="success">Graded</Tag>;
    default:
      return <Tag>Unknown</Tag>;
  }
};

interface EnrichedSubmission extends Submission {
  courseName?: string;
  courseId?: number;
  semesterCode?: string;
  semesterEndDate?: string;
  isSemesterPassed?: boolean;
  gradingGroup?: GradingGroup;
  totalScore?: number;
}

const MySubmissionsPageContent = () => {
  const [searchText, setSearchText] = useState("");
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const queryClient = useQueryClient();

  const { user, isLoading: authLoading } = useAuth();

  // Fetch lecturer ID
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

  const [selectedSemester, setSelectedSemester] = useState<number | undefined>(
    undefined
  );

  // Fetch all semesters for default selection
  const { data: allSemestersData } = useQuery({
    queryKey: queryKeys.semesters.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => semesterService.getSemesters({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(
    undefined
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(
    undefined
  );
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedGradingGroupForUpload, setSelectedGradingGroupForUpload] = useState<GradingGroup | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);

  // Mutation for batch grading
  const batchGradingMutation = useMutation({
    mutationFn: async (submissions: EnrichedSubmission[]) => {
      const gradingPromises = submissions.map(async (submission) => {
        try {
          const gradingGroup = submission.gradingGroup;
          if (!gradingGroup?.assessmentTemplateId) {
            return { 
              success: false, 
              submissionId: submission.id, 
              error: "Cannot find assessment template for this submission" 
            };
          }

          await gradingService.autoGrading({
            submissionId: submission.id,
            assessmentTemplateId: gradingGroup.assessmentTemplateId,
          });
          return { success: true, submissionId: submission.id };
      } catch (err: any) {
          console.error(`Failed to grade submission ${submission.id}:`, err);
          return { 
            success: false, 
            submissionId: submission.id, 
            error: err.message || "Unknown error" 
          };
        }
      });

      return Promise.all(gradingPromises);
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        messageApi.success(`Batch grading started for ${successCount}/${results.length} submission(s)`);
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
        queryClient.invalidateQueries({ queryKey: ['gradeItems'] });
        queryClient.invalidateQueries({ queryKey: ['submissions'] });
      }
      if (failCount > 0) {
        messageApi.warning(`Failed to start grading for ${failCount} submission(s)`);
      }
    },
    onError: (err: any) => {
      console.error("Failed to start batch grading:", err);
      messageApi.error(err.message || "Failed to start batch grading");
    },
  });

  // Mutation for uploading grade sheet
  const uploadGradeSheetMutation = useMutation({
    mutationFn: async ({ gradingGroupId, file }: { gradingGroupId: number; file: File }) => {
      return gradingGroupService.submitGradesToExaminer(gradingGroupId, file);
    },
    onSuccess: () => {
      messageApi.success("Grade sheet uploaded successfully!");
      setUploadModalVisible(false);
      setSelectedGradingGroupForUpload(null);
      setUploadFile(null);
      setUploadFileList([]);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
    onError: (err: any) => {
      console.error("Failed to upload grade sheet:", err);
      const errorMessage = err.message || err.response?.data?.errorMessages?.join(", ") || "Failed to upload grade sheet";
      messageApi.error(errorMessage);
    },
  });

        // Fetch grading groups for this lecturer
  const { data: gradingGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: queryKeys.grading.groups.list({ lecturerId: currentLecturerId! }),
    queryFn: () => gradingGroupService.getGradingGroups({
      lecturerId: currentLecturerId!,
    }),
    enabled: !!currentLecturerId,
  });

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

        // Fetch all submissions from all grading groups
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

  // Fetch only latest grading session for each submission (optimized: pageSize: 1)
  const gradingSessionsQueries = useQueries({
    queries: allSubmissions.map((submission) => ({
      queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 1 }),
      queryFn: () => gradingService.getGradingSessions({
        submissionId: submission.id,
        pageNumber: 1,
        pageSize: 1, // Only fetch latest session
      }),
      enabled: allSubmissions.length > 0,
    })),
  });

  // Calculate total scores for each submission using grade from session (no need to fetch grade items)
  const submissionTotalScores = useMemo(() => {
    const scoreMap: Record<number, number> = {};
    allSubmissions.forEach((submission, index) => {
      const sessionsQuery = gradingSessionsQueries[index];
      if (sessionsQuery?.data?.items && sessionsQuery.data.items.length > 0) {
        // Since we fetch pageSize: 1, the first item is already the latest
        const latestSession = sessionsQuery.data.items[0];
        if (latestSession.grade !== undefined && latestSession.grade !== null) {
          scoreMap[submission.id] = latestSession.grade;
        }
      }
    });
    return scoreMap;
  }, [allSubmissions, gradingSessionsQueries]);

  // Fetch class assessments
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

        // Get unique classIds from class assessments
  const classIds = useMemo(() => {
    return Array.from(new Set(Object.values(classAssessments).map((ca) => ca.classId)));
  }, [classAssessments]);
        
        // Fetch classes
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

        // Get unique semester codes from grading groups (only fetch details for semesters we actually use)
  const semesterCodesFromGroups = useMemo(() => {
    return Array.from(new Set(Object.values(gradingGroupToSemesterMap).filter(Boolean)));
  }, [gradingGroupToSemesterMap]);

  // Fetch semester details only for semesters that are actually used in grading groups
  const semesterDetailsQueries = useQueries({
    queries: semesterCodesFromGroups.map((semesterCode) => ({
      queryKey: ['semesterPlanDetail', semesterCode],
      queryFn: () => semesterService.getSemesterPlanDetail(semesterCode),
      enabled: semesterCodesFromGroups.length > 0,
    })),
  });

  const semesters = useMemo(() => {
    return semesterDetailsQueries
      .map(q => q.data)
      .filter((s): s is SemesterPlanDetail => s !== undefined);
  }, [semesterDetailsQueries]);

  // Set default to current semester
  useEffect(() => {
    if (allSemestersData && semesters.length > 0 && selectedSemester === undefined) {
      const now = new Date();
      // Find the current semester from allSemestersData
      const currentSemester = allSemestersData.find((sem: Semester) => {
        const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
        const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
        return now >= startDate && now <= endDate;
      });
      
      // Check if current semester has grading groups (is in semesters list)
      if (currentSemester) {
        const semesterDetail = semesters.find((s) => s.semesterCode === currentSemester.semesterCode);
        if (semesterDetail) {
          setSelectedSemester(Number(semesterDetail.id));
        } else {
          // If no current semester or current semester has no grading groups, fallback to latest semester with grading groups
          const latestSemester = [...semesters].sort((a, b) => {
            const dateA = new Date(a.endDate || 0).getTime();
            const dateB = new Date(b.endDate || 0).getTime();
            return dateB - dateA; // Descending order (newest first)
          })[0];
          if (latestSemester) {
            setSelectedSemester(Number(latestSemester.id));
          }
        }
      } else {
        // If no current semester, fallback to latest semester with grading groups
        const latestSemester = [...semesters].sort((a, b) => {
          const dateA = new Date(a.endDate || 0).getTime();
          const dateB = new Date(b.endDate || 0).getTime();
          return dateB - dateA; // Descending order (newest first)
        })[0];
        if (latestSemester) {
          setSelectedSemester(Number(latestSemester.id));
        }
      }
    }
  }, [allSemestersData, semesters, selectedSemester]);

  // Calculate loading state (optimized: removed gradeItemsQueries check since we use session.grade)
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
    return allSubmissions
      .filter((sub: Submission) => {
        // Only include submissions from filtered grading groups
        return sub.gradingGroupId !== undefined && filteredGradingGroupIds.has(sub.gradingGroupId);
      })
      .map((sub: Submission) => {
        // Get semester code from grading group
        const semesterCode = sub.gradingGroupId !== undefined 
          ? gradingGroupToSemesterMap[sub.gradingGroupId] 
          : undefined;
        
        // Find semester from SemesterPlanDetail to get end date
        const semesterDetail = semesterCode ? semesters.find((s) => s.semesterCode === semesterCode) : undefined;
        const semesterEndDate = semesterDetail?.endDate;
        // Tạm comment lại check học kỳ
        // const isPassed = isSemesterPassed(semesterEndDate);
        
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
          // Tạm comment lại check học kỳ
          isSemesterPassed: false, // isPassed,
          gradingGroup,
          totalScore,
      };
    });
  }, [allSubmissions, classAssessments, semesters, filteredGradingGroups, filteredGradingGroupIds, gradingGroupToSemesterMap, gradingGroupToCourseMap, submissionTotalScores]);

  // Get available courses based on selected semester - only show courses that have grading groups
  const availableCourses = useMemo(() => {
    const courseMap = new Map<number, { courseId: number; courseName: string }>();
    
    gradingGroups.forEach((group) => {
      const courseInfo = gradingGroupToCourseMap[group.id];
      const semesterCode = gradingGroupToSemesterMap[group.id];
      
      if (!courseInfo) return;
      
      // Filter by selected semester if any
      if (selectedSemester !== undefined) {
        const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
        const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
        if (selectedSemesterCode && semesterCode !== selectedSemesterCode) {
          return;
        }
      }
      
      if (!courseMap.has(courseInfo.courseId)) {
        courseMap.set(courseInfo.courseId, { courseId: courseInfo.courseId, courseName: courseInfo.courseName });
      }
    });
    
    return Array.from(courseMap.values());
  }, [gradingGroups, gradingGroupToCourseMap, gradingGroupToSemesterMap, selectedSemester, semesters]);

  // Get available templates based on selected semester and course - only show templates that have grading groups
  const availableTemplates = useMemo(() => {
    const templateMap = new Map<number, { id: number; name: string; assessmentTemplateId: number | null }>();
    
    gradingGroups.forEach((group) => {
      const courseInfo = gradingGroupToCourseMap[group.id];
      const semesterCode = gradingGroupToSemesterMap[group.id];
      const templateId = group.assessmentTemplateId;
      
      if (!templateId) return;
      
      // Filter by selected semester if any
      if (selectedSemester !== undefined) {
        const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
        const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
        if (selectedSemesterCode && semesterCode !== selectedSemesterCode) {
          return;
        }
      }
      
      // Filter by selected course if any
      if (selectedCourseId !== undefined) {
        if (courseInfo?.courseId !== selectedCourseId) {
          return;
        }
      }
      
      if (!templateMap.has(templateId)) {
        templateMap.set(templateId, {
          id: templateId,
          name: group.assessmentTemplateName || `Template ${templateId}`,
          assessmentTemplateId: templateId,
        });
      }
    });
    
    return Array.from(templateMap.values());
  }, [gradingGroups, gradingGroupToCourseMap, gradingGroupToSemesterMap, selectedSemester, selectedCourseId, semesters]);

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

      // Filter by template (assessment template ID)
      let templateMatch = true;
      if (selectedTemplateId !== undefined) {
        const group = gradingGroups.find(g => g.id === sub.gradingGroupId);
        templateMatch = group?.assessmentTemplateId === selectedTemplateId;
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
    // Use studentCode for more reliable identification
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
          // Current submission has newer date
          groupedMap.set(key, sub);
        } else if (currentDate < existingDate) {
          // Existing submission has newer date, keep it
          // Do nothing, keep existing
        } else {
          // Dates are equal (both 0 or same date), keep the one with the largest ID (newest)
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
    gradingGroups,
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
            courseName: sub.courseName || `Course ${sub.courseId}`,
            semesterCode: sub.semesterCode,
            submissions: [],
          });
        }
        groupMap.get(key)!.submissions.push(sub);
      }
    });

    // For each group, filter to keep only the latest submission per student (by studentCode)
    groupMap.forEach((group) => {
      const studentMap = new Map<string, EnrichedSubmission>();
      
      group.submissions.forEach((sub) => {
        // Use studentCode as key (more reliable than studentId)
        const studentKey = sub.studentCode || sub.studentId?.toString() || 'unknown';
        const existing = studentMap.get(studentKey);
        
        if (!existing) {
          studentMap.set(studentKey, sub);
        } else {
          // Compare submittedAt - keep the one with the latest date
          const existingDate = existing.submittedAt ? new Date(existing.submittedAt).getTime() : 0;
          const currentDate = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
          
          if (currentDate > existingDate) {
            // Current submission has newer date
            studentMap.set(studentKey, sub);
          } else if (currentDate < existingDate) {
            // Existing submission has newer date, keep it
            // Do nothing, keep existing
          } else {
            // Dates are equal (both 0 or same date), keep the one with the largest ID (newest)
            if (sub.id > existing.id) {
              studentMap.set(studentKey, sub);
            }
          }
        }
      });
      
      // Replace submissions with filtered list (only latest per student)
      group.submissions = Array.from(studentMap.values());
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


  const handleUploadGradeSheet = (gradingGroup: GradingGroup) => {
    setSelectedGradingGroupForUpload(gradingGroup);
    setUploadFile(null);
    setUploadFileList([]);
    setUploadModalVisible(true);
  };

  const handleUploadSubmit = async () => {
    if (!selectedGradingGroupForUpload || !uploadFile) {
      messageApi.warning("Please select a file to upload");
      return;
    }

    uploadGradeSheetMutation.mutate({
      gradingGroupId: selectedGradingGroupForUpload.id,
      file: uploadFile,
    });
  };

  const handleExportGradeReport = async (gradingGroup: GradingGroup) => {
    try {
      messageApi.info("Preparing grade report...");

      // Get all submissions for this grading group
      const groupSubmissions = await submissionService.getSubmissionList({
        gradingGroupId: gradingGroup.id,
      });

      if (groupSubmissions.length === 0) {
        messageApi.warning("No submissions found for this grading group");
        return;
      }

      // Get assessment template
      if (!gradingGroup.assessmentTemplateId) {
        messageApi.error("Assessment template not found");
        return;
      }

      const templatesRes = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      const assessmentTemplate = templatesRes.items.find(
        (t) => t.id === gradingGroup.assessmentTemplateId
      );

      if (!assessmentTemplate) {
        messageApi.error("Assessment template not found");
        return;
      }

      // Get course element
      if (!assessmentTemplate.courseElementId) {
        messageApi.error("Course element not found");
        return;
      }

      const courseElements = await courseElementService.getCourseElements({
        pageNumber: 1,
        pageSize: 1000,
      });
      const courseElement = courseElements.find(
        (ce) => ce.id === assessmentTemplate.courseElementId
      );

      if (!courseElement) {
        messageApi.error("Course element not found");
        return;
      }

      // Fetch questions and rubrics
      let questions: AssessmentQuestion[] = [];
      const rubrics: { [questionId: number]: RubricItem[] } = {};

      try {
        const papersRes = await assessmentPaperService.getAssessmentPapers({
          assessmentTemplateId: assessmentTemplate.id,
          pageNumber: 1,
          pageSize: 100,
        });

        for (const paper of papersRes.items) {
          const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
            assessmentPaperId: paper.id,
            pageNumber: 1,
            pageSize: 100,
          });
          questions = [...questions, ...questionsRes.items];

          for (const question of questionsRes.items) {
            const rubricsRes = await rubricItemService.getRubricsForQuestion({
              assessmentQuestionId: question.id,
              pageNumber: 1,
              pageSize: 100,
            });
            rubrics[question.id] = rubricsRes.items;
          }
        }
      } catch (err) {
        console.error("Failed to fetch questions/rubrics:", err);
      }

      // Prepare report data
      const reportData: GradeReportData[] = [];

      for (const submission of groupSubmissions) {
        let gradingSession = null;
        let gradeItems: any[] = [];

        try {
          const gradingSessionsResult = await gradingService.getGradingSessions({
            submissionId: submission.id,
          });
          if (gradingSessionsResult.items.length > 0) {
            gradingSession = gradingSessionsResult.items.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
            
            const gradeItemsResult = await gradeItemService.getGradeItems({
              gradingSessionId: gradingSession.id,
            });
            gradeItems = gradeItemsResult.items;
          }
        } catch (err) {
          console.error(`Failed to fetch grading data for submission ${submission.id}:`, err);
        }

        // Determine assignment type
        const nameLower = (courseElement.name || "").toLowerCase();
        const assignmentType: "Assignment" | "Lab" | "Practical Exam" = 
          nameLower.includes("lab") || nameLower.includes("thực hành") ? "Lab" :
          nameLower.includes("exam") || nameLower.includes("pe") || nameLower.includes("practical") ||
          nameLower.includes("thi thực hành") || nameLower.includes("kiểm tra thực hành") ? "Practical Exam" :
          "Assignment";

        reportData.push({
          submission,
          gradingSession,
          gradeItems,
          questions,
          rubrics,
          feedback: {
            overallFeedback: "",
            strengths: "",
            weaknesses: "",
            codeQuality: "",
            algorithmEfficiency: "",
            suggestionsForImprovement: "",
            bestPractices: "",
            errorHandling: "",
          },
          courseElementName: courseElement.name,
          assignmentType: assignmentType,
        });
      }

      if (reportData.length === 0) {
        messageApi.warning("No data available to export");
        return;
      }

      await exportGradeReportToExcel(
        reportData,
        `Grade_Report_${gradingGroup.assessmentTemplateName || gradingGroup.id}`
      );
      messageApi.success("Grade report exported successfully");
    } catch (err: any) {
      console.error("Export error:", err);
      messageApi.error(err.message || "Export failed. Please check browser console for details.");
    }
  };

  const handleBatchGrading = async () => {
    if (filteredData.length === 0) {
      messageApi.warning("No submissions to grade");
      return;
    }

    messageApi.loading(`Starting batch grading for ${filteredData.length} submission(s)...`, 0);
    batchGradingMutation.mutate(filteredData, {
      onSettled: () => {
        messageApi.destroy();
      },
    });
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

              // Also download assessment files if any
              try {
                const filesRes = await assessmentFileService.getFilesForTemplate({
                  assessmentTemplateId: gradingGroup.assessmentTemplateId,
                  pageNumber: 1,
                  pageSize: 1000,
                });

                if (filesRes.items.length > 0) {
                  for (const file of filesRes.items) {
                    try {
                      const response = await fetch(file.fileUrl);
                      if (response.ok) {
                        const blob = await response.blob();
                        requirementFolder.file(file.name, blob);
                      }
                    } catch (err) {
                      console.error(`Failed to download assessment file ${file.name}:`, err);
                    }
                  }
                }
              } catch (err) {
                console.error(`Failed to fetch assessment files:`, err);
              }
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
                // Try to download submission file
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
                  // Create a placeholder file to indicate missing submission
                  const fileName = `${sub.studentCode}_${sub.studentName.replace(/[^a-zA-Z0-9]/g, "_")}_MISSING_${sub.submissionFile.name || `submission_${sub.id}.zip`}`;
                  submissionsFolder.file(fileName, new Blob([`Submission file not available. URL: ${sub.submissionFile.submissionUrl}`], { type: 'text/plain' }));
                }
              } catch (err) {
                console.error(`Failed to download submission ${sub.id}:`, err);
                // Create a placeholder file to indicate error
                const fileName = `${sub.studentCode}_${sub.studentName.replace(/[^a-zA-Z0-9]/g, "_")}_ERROR_${sub.submissionFile.name || `submission_${sub.id}.zip`}`;
                submissionsFolder.file(fileName, new Blob([`Error downloading submission: ${err}`], { type: 'text/plain' }));
              }
            } else {
              // No submission file URL
              const fileName = `${sub.studentCode}_${sub.studentName.replace(/[^a-zA-Z0-9]/g, "_")}_NO_FILE.txt`;
              submissionsFolder.file(fileName, new Blob([`No submission file available for submission ID: ${sub.id}`], { type: 'text/plain' }));
            }
        }
      }
      }

      // Generate zip file
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Grading_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      messageApi.destroy();
      messageApi.success("Download completed successfully");
    } catch (err: any) {
      console.error("Failed to download:", err);
      messageApi.destroy();
      messageApi.error(err.message || "Failed to download files");
    }
  };

  const columns: ColumnsType<EnrichedSubmission> = useMemo(() => [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      sorter: (a: EnrichedSubmission, b: EnrichedSubmission) => a.id - b.id,
    },
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
      render: (date: string) => formatUtcDate(date, "DD/MM/YYYY HH:mm"),
      sorter: (a: EnrichedSubmission, b: EnrichedSubmission) =>
        new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
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
  ], []);

  // Flatten all grading groups into a single array for table
  // Group by Course, Template, Semester - merge submissions from multiple grading groups
  const flatGradingGroups = useMemo(() => {
    // Use a composite key object to avoid string splitting issues
    interface GroupKey {
      courseId: number;
      templateId: number;
      semesterCode: string;
    }
    
    const keyToString = (key: GroupKey): string => {
      return `${key.courseId}|${key.templateId}|${key.semesterCode}`;
    };

    const groupedMap = new Map<string, {
      key: string; // Unique key for this grouped item
      id: number; // Use the latest grading group ID
      courseCode: string;
      courseName: string;
      templateName: string;
      semesterCode: string;
      submissionCount: number;
      gradingGroupIds: number[]; // All grading group IDs that match
      gradingGroup: GradingGroup; // Latest grading group
    }>();

    // First pass: collect all unique keys
    const allKeys = new Map<string, GroupKey>();
    gradingGroups.forEach((gradingGroup) => {
      const courseInfo = gradingGroupToCourseMap[gradingGroup.id];
      const semesterCode = gradingGroupToSemesterMap[gradingGroup.id];
      const templateId = gradingGroup.assessmentTemplateId;
      
      if (courseInfo && semesterCode && templateId !== null && templateId !== undefined) {
        const key: GroupKey = {
          courseId: courseInfo.courseId,
          templateId: templateId,
          semesterCode: semesterCode,
        };
        const keyStr = keyToString(key);
        if (!allKeys.has(keyStr)) {
          allKeys.set(keyStr, key);
        }
      }
    });

    // Second pass: process each unique key and group matching grading groups
    allKeys.forEach((key, keyStr) => {
      // Find all grading groups that match this key
      const matchingGroups = gradingGroups.filter(g => {
        const gCourseInfo = gradingGroupToCourseMap[g.id];
        const gSemesterCode = gradingGroupToSemesterMap[g.id];
        const gTemplateId = g.assessmentTemplateId;
        // Ensure strict comparison with type conversion
        return gCourseInfo?.courseId === key.courseId &&
               String(gSemesterCode) === String(key.semesterCode) &&
               Number(gTemplateId) === Number(key.templateId);
      });

      if (matchingGroups.length === 0) return;

      // Get the latest grading group (by createdAt)
      const latestGroup = matchingGroups.reduce((latest, current) => {
        const latestDate = latest.createdAt ? new Date(latest.createdAt).getTime() : 0;
        const currentDate = current.createdAt ? new Date(current.createdAt).getTime() : 0;
        return currentDate > latestDate ? current : latest;
      });

      const courseInfo = gradingGroupToCourseMap[latestGroup.id];
      if (!courseInfo) return;

      // Get all matching group IDs
      const matchingGroupIds = matchingGroups.map(g => g.id);

      // Count unique students (latest submission per student) across all matching groups
      const studentSubmissions = new Map<number, EnrichedSubmission>();
      enrichedSubmissions.forEach((sub) => {
        if (matchingGroupIds.includes(sub.gradingGroupId || -1) && sub.studentId) {
          const existing = studentSubmissions.get(sub.studentId);
          if (!existing) {
            studentSubmissions.set(sub.studentId, sub);
          } else {
            const existingDate = existing.submittedAt ? new Date(existing.submittedAt).getTime() : 0;
            const currentDate = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
            if (currentDate > existingDate || (currentDate === existingDate && sub.id > existing.id)) {
              studentSubmissions.set(sub.studentId, sub);
            }
          }
        }
      });

      groupedMap.set(keyStr, {
        key: keyStr, // Use the composite key as unique identifier
        id: latestGroup.id,
        courseCode: courseInfo.courseName.split(' - ')[0] || courseInfo.courseName,
        courseName: courseInfo.courseName,
        templateName: latestGroup.assessmentTemplateName || `Template ${latestGroup.id}`,
        semesterCode: key.semesterCode,
        submissionCount: studentSubmissions.size,
        gradingGroupIds: matchingGroupIds,
        gradingGroup: latestGroup,
      });
    });

    // Apply filters to the grouped results
    let filtered = Array.from(groupedMap.values());

    // Filter by selected semester
    if (selectedSemester !== undefined) {
      const selectedSemesterDetail = semesters.find((s) => Number(s.id) === Number(selectedSemester));
      const selectedSemesterCode = selectedSemesterDetail?.semesterCode;
      if (selectedSemesterCode) {
        filtered = filtered.filter(g => g.semesterCode === selectedSemesterCode);
      }
    }

    // Filter by selected course
    if (selectedCourseId !== undefined) {
      filtered = filtered.filter(g => {
        // Get course info from the grading group in the grouped item
        const group = gradingGroups.find(gg => g.gradingGroupIds.includes(gg.id));
        if (!group) return false;
        const courseInfo = gradingGroupToCourseMap[group.id];
        return courseInfo?.courseId === selectedCourseId;
      });
    }

    // Filter by selected template
    if (selectedTemplateId !== undefined) {
      filtered = filtered.filter(g => {
        // Get template ID from the grading group in the grouped item
        const group = gradingGroups.find(gg => g.gradingGroupIds.includes(gg.id));
        return group?.assessmentTemplateId === selectedTemplateId;
      });
    }

    return filtered;
  }, [gradingGroups, gradingGroupToCourseMap, gradingGroupToSemesterMap, enrichedSubmissions, selectedSemester, selectedCourseId, selectedTemplateId, semesters]);

  const gradingGroupColumns: ColumnsType<typeof flatGradingGroups[0]> = useMemo(() => [
    {
      title: "Course",
      key: "course",
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{record.courseCode}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.courseName}
          </Text>
        </div>
      ),
    },
    {
      title: "Template",
      dataIndex: "templateName",
      key: "template",
      width: 200,
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: "Semester",
      dataIndex: "semesterCode",
      key: "semester",
      width: 120,
      render: (semester) => semester ? (
        <Tag color="purple">{semester}</Tag>
      ) : (
        <Text type="secondary">N/A</Text>
      ),
    },
    {
      title: "Submissions",
      dataIndex: "submissionCount",
      key: "submissions",
      width: 120,
      align: "center",
      render: (count) => (
        <Tag color={count > 0 ? "green" : "default"}>{count}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => router.push(`/lecturer/grading-group/${record.id}`)}
          size="small"
        >
          Manage
        </Button>
      ),
    },
  ], [router]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <Title
            level={2}
            style={{ margin: 0, fontWeight: 700, color: "#2F327D" }}
          >
            Grading Groups
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Manage your grading groups and submissions
          </Text>
        </div>
        <Space>
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
        <>
          {/* Filter Section */}
          <Card style={{ marginBottom: 16 }}>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Text strong style={{ fontSize: 16 }}>Filters</Text>
              <Space wrap>
                <div>
                  <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                    Semester
                  </Text>
                  <Select
                    style={{ width: 200 }}
                    placeholder="Select semester"
                    value={selectedSemester}
                    onChange={(value) => {
                      setSelectedSemester(value);
                      setSelectedCourseId(undefined);
                      setSelectedTemplateId(undefined);
                    }}
                    allowClear
                  >
                    {semesters.map((sem) => (
                      <Select.Option key={sem.id} value={Number(sem.id)}>
                        {sem.semesterCode}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                    Course
                  </Text>
                  <Select
                    style={{ width: 200 }}
                    placeholder="Select course"
                    value={selectedCourseId}
                    onChange={(value) => {
                      setSelectedCourseId(value);
                      setSelectedTemplateId(undefined);
                    }}
                    allowClear
                    disabled={selectedSemester === undefined}
                  >
                    {availableCourses.map((course) => (
                      <Select.Option key={course.courseId} value={course.courseId}>
                        {course.courseName}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
                    Template
                  </Text>
                  <Select
                    style={{ width: 200 }}
                    placeholder="Select template"
                    value={selectedTemplateId}
                    onChange={setSelectedTemplateId}
                    allowClear
                    disabled={selectedCourseId === undefined}
                  >
                    {availableTemplates.map((template) => (
                      <Select.Option key={template.id} value={template.id}>
                        {template.name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </Space>
            </Space>
          </Card>

          <Card
            title={
              <Space>
                <Text strong style={{ fontSize: 18 }}>Grading Groups</Text>
              </Space>
            }
          >
            {flatGradingGroups.length === 0 ? (
              <Empty
                description="No grading groups found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Table
                columns={gradingGroupColumns}
                dataSource={flatGradingGroups}
                rowKey="key"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} grading groups`,
                }}
                scroll={{ x: 1000 }}
              />
            )}
          </Card>
        </>
      )}

      <Modal
        title="Upload Grade Sheet"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setSelectedGradingGroupForUpload(null);
          setUploadFile(null);
          setUploadFileList([]);
        }}
        onOk={handleUploadSubmit}
        confirmLoading={uploadGradeSheetMutation.isPending}
        okText="Upload"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>Select Excel file to upload:</Text>
          <Upload
            fileList={uploadFileList}
            beforeUpload={(file) => {
              setUploadFile(file);
              setUploadFileList([{
                uid: file.name,
                name: file.name,
                status: 'done',
              }]);
              return false; // Prevent auto upload
            }}
            accept=".xlsx,.xls"
            maxCount={1}
            onRemove={() => {
              setUploadFile(null);
              setUploadFileList([]);
            }}
          >
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
          {uploadFile && (
            <Text type="secondary">Selected: {uploadFile.name}</Text>
          )}
        </Space>
    </Modal>

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
