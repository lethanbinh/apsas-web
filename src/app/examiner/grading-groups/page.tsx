"use client";
import { QueryParamsHandler } from "@/components/common/QueryParamsHandler";
import { AssignSubmissionsModal } from "@/components/examiner/AssignSubmissionsModal";
import { CreateGradingGroupModal } from "@/components/examiner/CreateGradingGroupModal";
import { queryKeys } from "@/lib/react-query";
import { assessmentFileService } from "@/services/assessmentFileService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";
import { ClassAssessment, classAssessmentService } from "@/services/classAssessmentService";
import { ClassInfo, classService } from "@/services/classService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import {
  GradingGroup,
  gradingGroupService,
} from "@/services/gradingGroupService";
import { lecturerService } from "@/services/lecturerService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { semesterService } from "@/services/semesterService";
import { Submission, submissionService } from "@/services/submissionService";
import {
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import { GradingGroupFilters } from "./components/GradingGroupFilters";
import { GradingGroupTable, FlatGradingGroup } from "./components/GradingGroupTable";
import { flattenGradingGroups } from "./utils/flattenGradingGroups";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableProps } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography
} from "antd";
import { useEffect, useMemo, useState } from "react";
import styles from "./GradingGroups.module.css";
import { handleDownloadAll } from "./utils/downloadAll";
const { Title, Text } = Typography;
const GradingGroupsPageContent = () => {
  const queryClient = useQueryClient();
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedLecturerId, setSelectedLecturerId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GradingGroup | null>(null);
  const { message } = App.useApp();
  const { data: allGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: queryKeys.grading.groups.all,
    queryFn: () => gradingGroupService.getGradingGroups({}),
  });
  const { data: allLecturers = [] } = useQuery({
    queryKey: queryKeys.lecturers.list(),
    queryFn: () => lecturerService.getLecturerList(),
  });
  const { data: allSemesters = [] } = useQuery({
    queryKey: queryKeys.semesters.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => semesterService.getSemesters({ pageNumber: 1, pageSize: 1000 }),
  });
  const { data: assignRequestResponse } = useQuery({
    queryKey: queryKeys.assignRequests.lists(),
    queryFn: () => assignRequestService.getAssignRequests({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });
  const approvedAssignRequestIds = useMemo(() => {
    const ids = new Set<number>();
    if (assignRequestResponse?.items) {
      const approvedAssignRequests = assignRequestResponse.items.filter(ar => ar.status === 5);
      approvedAssignRequests.forEach(ar => {
        if (ar.id) {
          ids.add(ar.id);
        }
      });
    }
    return ids;
  }, [assignRequestResponse]);
  const gradingGroupIds = allGroups.map(g => g.id);
  const { data: allSubmissionsData } = useQuery({
    queryKey: ['submissions', 'byGradingGroups', gradingGroupIds],
    queryFn: async () => {
      if (gradingGroupIds.length === 0) return [];
      const allSubmissionPromises = gradingGroupIds.map(groupId =>
        submissionService.getSubmissionList({ gradingGroupId: groupId }).catch(() => [])
      );
      const allSubmissionResults = await Promise.all(allSubmissionPromises);
      return allSubmissionResults.flat();
    },
    enabled: gradingGroupIds.length > 0,
  });
  const allSubmissions = allSubmissionsData || [];
      const classAssessmentIds = Array.from(
    new Set(allSubmissions.filter(s => s.classAssessmentId).map(s => s.classAssessmentId!))
  );
  const { data: allClassAssessmentsRes } = useQuery({
    queryKey: queryKeys.classAssessments.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => classAssessmentService.getClassAssessments({
        pageNumber: 1,
        pageSize: 1000,
    }),
  });
  const allClassAssessments = useMemo(() => {
    const map = new Map<number, ClassAssessment>();
    (allClassAssessmentsRes?.items || []).forEach(ca => {
        if (classAssessmentIds.includes(ca.id)) {
        map.set(ca.id, ca);
        }
      });
    return map;
  }, [allClassAssessmentsRes, classAssessmentIds]);
      const assessmentTemplateIdsFromClassAssessments = Array.from(
    new Set(Array.from(allClassAssessments.values()).map(ca => ca.assessmentTemplateId))
      );
      const assessmentTemplateIdsFromGroups = Array.from(
    new Set(allGroups.filter(g => g.assessmentTemplateId !== null).map(g => g.assessmentTemplateId!))
      );
      const allAssessmentTemplateIds = Array.from(
        new Set([...assessmentTemplateIdsFromClassAssessments, ...assessmentTemplateIdsFromGroups])
      );
  const { data: allAssessmentTemplatesRes } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
    }),
  });
  const { data: allCourseElementsRes = [] } = useQuery({
    queryKey: queryKeys.courseElements.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => courseElementService.getCourseElements({
        pageNumber: 1,
        pageSize: 1000,
    }),
  });
  const allCourseElementsMap = useMemo(() => {
    const map = new Map<number, CourseElement>();
    allCourseElementsRes.forEach(element => {
      map.set(element.id, element);
    });
    return map;
  }, [allCourseElementsRes]);
  const allAssessmentTemplates = useMemo(() => {
    const map = new Map<number, AssessmentTemplate>();
    (allAssessmentTemplatesRes?.items || []).forEach(template => {
        if (allAssessmentTemplateIds.includes(template.id)) {
          const courseElement = allCourseElementsMap.get(template.courseElementId);
          if (courseElement?.elementType !== 2) return;
          if (!template.assignRequestId || !approvedAssignRequestIds.has(template.assignRequestId)) {
            return;
          }
          map.set(template.id, template);
        }
      });
    return map;
  }, [allAssessmentTemplatesRes, allAssessmentTemplateIds, allCourseElementsMap, approvedAssignRequestIds]);
      const courseElementIds = Array.from(
    new Set(Array.from(allAssessmentTemplates.values()).map(t => t.courseElementId))
  );
  const allCourseElements = useMemo(() => {
    const map = new Map<number, CourseElement>();
      allCourseElementsRes.forEach(element => {
        if (courseElementIds.includes(element.id)) {
        map.set(element.id, element);
      }
    });
    return map;
  }, [allCourseElementsRes, courseElementIds]);
  const gradingGroupToSemesterMap = useMemo(() => {
    const map = new Map<number, string>();
    allGroups.forEach(group => {
        if (group.assessmentTemplateId !== null && group.assessmentTemplateId !== undefined) {
        const assessmentTemplate = allAssessmentTemplates.get(Number(group.assessmentTemplateId));
          if (assessmentTemplate) {
          const courseElement = allCourseElements.get(Number(assessmentTemplate.courseElementId));
            if (courseElement && courseElement.semesterCourse && courseElement.semesterCourse.semester) {
              const semesterCode = courseElement.semesterCourse.semester.semesterCode;
            map.set(Number(group.id), semesterCode);
            }
          }
        }
      });
    return map;
  }, [allGroups, allAssessmentTemplates, allCourseElements]);
  const classIds = Array.from(new Set(Array.from(allClassAssessments.values()).map(ca => ca.classId)));
  const { data: classesData } = useQuery({
    queryKey: ['classes', 'byIds', classIds],
    queryFn: async () => {
      if (classIds.length === 0) return [];
      const classPromises = classIds.map(classId =>
        classService.getClassById(classId).catch(() => null)
      );
      const classResults = await Promise.all(classPromises);
      return classResults.filter(cls => cls !== null) as ClassInfo[];
    },
    enabled: classIds.length > 0,
  });
  const allClasses = useMemo(() => {
    const map = new Map<number, ClassInfo>();
    (classesData || []).forEach(cls => {
      if (cls) map.set(cls.id, cls);
    });
    return map;
  }, [classesData]);
  const loading = isLoadingGroups && allGroups.length === 0;
  const error = null;
  const enrichedSubmissionsMap = useMemo(() => {
    const map = new Map<number, Submission & { submissionUrl?: string; fileName?: string }>();
    allSubmissions.forEach(sub => {
      map.set(sub.id, {
        ...sub,
        submissionUrl: sub.submissionFile?.submissionUrl,
        fileName: sub.submissionFile?.name,
      });
    });
    return map;
  }, [allSubmissions]);
  const availableSemesters = useMemo(() => {
    const now = new Date();
    const filtered = allSemesters.filter((sem) => {
      const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
      return startDate <= now;
    });
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.startDate.endsWith("Z") ? a.startDate : a.startDate + "Z").getTime();
      const dateB = new Date(b.startDate.endsWith("Z") ? b.startDate : b.startDate + "Z").getTime();
      return dateB - dateA;
    });
    return sorted.map(sem => sem.semesterCode);
  }, [allSemesters]);
  useEffect(() => {
    if (allSemesters.length > 0 && selectedSemester === null) {
      const now = new Date();
      const filteredSemesters = allSemesters.filter((sem) => {
        const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
        return startDate <= now;
      });
      if (filteredSemesters.length === 0) return;
      const currentSemester = filteredSemesters.find((sem) => {
        const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
        const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
        return now >= startDate && now <= endDate;
      });
      if (currentSemester) {
        setSelectedSemester(currentSemester.semesterCode);
      } else {
        const latestSemester = [...filteredSemesters].sort((a, b) => {
          const dateA = new Date(a.startDate.endsWith("Z") ? a.startDate : a.startDate + "Z").getTime();
          const dateB = new Date(b.startDate.endsWith("Z") ? b.startDate : b.startDate + "Z").getTime();
          return dateB - dateA;
        })[0];
        if (latestSemester) {
          setSelectedSemester(latestSemester.semesterCode);
        }
      }
    }
  }, [allSemesters, selectedSemester]);
  useEffect(() => {
    if (selectedSemester !== null && selectedSemester !== "all" && availableSemesters.length > 0) {
      if (!availableSemesters.includes(selectedSemester)) {
        setSelectedSemester(null);
      }
    }
  }, [availableSemesters, selectedSemester]);
  const availableCourses = useMemo(() => {
    const now = new Date();
    const courseMap = new Map<number, { id: number; name: string; code: string }>();
    allCourseElements.forEach(ce => {
      if (ce.semesterCourse?.course && ce.semesterCourse?.semester) {
        const semester = ce.semesterCourse.semester;
        const semesterData = allSemesters.find((s) => s.semesterCode === semester.semesterCode);
        if (semesterData) {
          const startDate = new Date(semesterData.startDate.endsWith("Z") ? semesterData.startDate : semesterData.startDate + "Z");
          if (startDate > now) {
            return;
          }
        }
        if (selectedSemester !== null && selectedSemester !== "all" && semester.semesterCode !== selectedSemester) {
          return;
        }
        const course = ce.semesterCourse.course;
        if (!courseMap.has(course.id)) {
          courseMap.set(course.id, {
            id: course.id,
            name: course.name,
            code: course.code,
          });
        }
      }
    });
    return Array.from(courseMap.values());
  }, [allCourseElements, selectedSemester, allSemesters]);
  const availableTemplates = useMemo(() => {
    return Array.from(allAssessmentTemplates.values()).map(t => ({
      id: t.id,
      name: t.name,
    }));
  }, [allAssessmentTemplates]);
  const availableLecturers = useMemo(() => {
    return allLecturers.map(l => ({
      id: Number(l.lecturerId),
      name: l.fullName,
      code: l.accountCode,
    }));
  }, [allLecturers]);
  const groupedByCourse = useMemo(() => {
    const now = new Date();
    const courseMap = new Map<number, {
      courseId: number;
      courseName: string;
      courseCode: string;
      templates: Map<number, {
        templateId: number;
        templateName: string;
        lecturers: Map<number, {
      lecturerId: number;
      lecturerName: string;
      lecturerCode: string | null;
      groups: (GradingGroup & { subs: any[]; semesterCode?: string })[];
        }>;
      }>;
    }>();
    allGroups.forEach((group) => {
      const template = group.assessmentTemplateId
        ? allAssessmentTemplates.get(Number(group.assessmentTemplateId))
        : null;
      if (!template) return;
      const courseElement = allCourseElements.get(Number(template.courseElementId));
      if (!courseElement?.semesterCourse?.course) return;
      const course = courseElement.semesterCourse.course;
      const courseId = course.id;
      const groupSemester = gradingGroupToSemesterMap.get(Number(group.id));
      if (groupSemester) {
        const semesterData = allSemesters.find((s) => s.semesterCode === groupSemester);
        if (semesterData) {
          const startDate = new Date(semesterData.startDate.endsWith("Z") ? semesterData.startDate : semesterData.startDate + "Z");
          if (startDate > now) {
            return;
          }
        }
      }
      if (selectedSemester !== null && selectedSemester !== "all") {
        if (!groupSemester || groupSemester !== selectedSemester) {
          return;
        }
      }
      if (selectedCourseId !== null && courseId !== selectedCourseId) {
        return;
      }
      if (selectedTemplateId !== null && template.id !== selectedTemplateId) {
        return;
      }
      if (selectedLecturerId !== null && group.lecturerId !== selectedLecturerId) {
        return;
      }
      const groupSubmissions = allSubmissions.filter(s => s.gradingGroupId === group.id);
      const subs = groupSubmissions.map((sub) => {
        const enriched = enrichedSubmissionsMap.get(sub.id);
        return {
          id: sub.id,
          studentId: sub.studentId,
          studentName: sub.studentName,
          studentCode: sub.studentCode,
          gradingGroupId: group.id,
          lecturerName: group.lecturerName || undefined,
          submittedAt: sub.submittedAt || "",
          status: sub.status,
          lastGrade: sub.lastGrade,
          submissionFile: {
            ...sub.submissionFile,
            submissionUrl: enriched?.submissionUrl || sub.submissionFile?.submissionUrl,
            name: enriched?.fileName || sub.submissionFile?.name,
          },
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        };
      });
      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          courseId,
          courseName: course.name,
          courseCode: course.code,
          templates: new Map(),
        });
      }
      const courseData = courseMap.get(courseId)!;
      const templateId = template.id;
      if (!courseData.templates.has(templateId)) {
        courseData.templates.set(templateId, {
          templateId,
          templateName: template.name,
          lecturers: new Map(),
        });
      }
      const templateData = courseData.templates.get(templateId)!;
      const lecturerId = group.lecturerId;
      if (!templateData.lecturers.has(lecturerId)) {
        templateData.lecturers.set(lecturerId, {
          lecturerId,
          lecturerName: group.lecturerName || "Unknown",
          lecturerCode: group.lecturerCode,
          groups: [],
        });
      }
      const lecturerData = templateData.lecturers.get(lecturerId)!;
      lecturerData.groups.push({ ...group, subs, semesterCode: groupSemester });
    });
    return Array.from(courseMap.values()).map(course => ({
      ...course,
      templates: Array.from(course.templates.values()).map(template => ({
        ...template,
        lecturers: Array.from(template.lecturers.values()),
      })),
    }));
  }, [
    allGroups,
    allSubmissions,
    enrichedSubmissionsMap,
    selectedSemester,
    selectedCourseId,
    selectedTemplateId,
    selectedLecturerId,
    gradingGroupToSemesterMap,
    allAssessmentTemplates,
    allCourseElements,
    allSemesters,
  ]);
  const handleOpenAssign = (group: GradingGroup) => {
    setSelectedGroup(group);
    setIsAssignModalOpen(true);
  };
  const handleModalCancel = () => {
    setIsCreateModalOpen(false);
    setIsAssignModalOpen(false);
    setSelectedGroup(null);
  };
  const deleteGradingGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return gradingGroupService.deleteGradingGroup(groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroups'] });
      message.success("Assignment deleted successfully");
    },
    onError: (err: any) => {
      console.error("Failed to delete grading group:", err);
      const errorMsg = err.response?.data?.errorMessages?.[0] || err.message || "Failed to delete assignment.";
      message.error(errorMsg);
    },
  });
  const handleModalOk = () => {
    setIsCreateModalOpen(false);
    setIsAssignModalOpen(false);
    setSelectedGroup(null);
  };
  const handleDeleteGroup = async (group: GradingGroup) => {
    deleteGradingGroupMutation.mutate(group.id);
  };
  const handleDownloadAllClick = async () => {
    await handleDownloadAll(groupedByCourse, message);
  };
  if (loading) {
    return (
      <div className={styles.spinner}>
        <Spin size="large" />
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.wrapper}>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all })}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }
  return (
    <>
      <QueryParamsHandler />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div>
          <Title
            level={2}
            style={{ margin: 0, fontWeight: 700, color: "#2F327D" }}
          >
            Teacher Assignment
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Assign submissions to teachers for grading
          </Text>
        </div>
        <Space>
            {groupedByCourse.length > 0 && (
          <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadAllClick}
                size="large"
              >
                Download All
          </Button>
            )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
            size="large"
          >
            Assign Teacher
          </Button>
        </Space>
      </div>
        <GradingGroupFilters
          availableSemesters={availableSemesters}
          availableCourses={availableCourses}
          availableTemplates={availableTemplates}
          availableLecturers={availableLecturers}
          selectedSemester={selectedSemester}
          selectedCourseId={selectedCourseId}
          selectedTemplateId={selectedTemplateId}
          selectedLecturerId={selectedLecturerId}
          onSemesterChange={setSelectedSemester}
          onCourseChange={setSelectedCourseId}
          onTemplateChange={setSelectedTemplateId}
          onLecturerChange={setSelectedLecturerId}
          filterTemplatesByCourse={(templateId) => {
            if (selectedCourseId === null) return false;
            const template = allAssessmentTemplates.get(templateId);
            if (!template) return false;
            const courseElement = allCourseElements.get(Number(template.courseElementId));
            return courseElement?.semesterCourse?.courseId === selectedCourseId;
          }}
        />
        {}
          <Card
            title={
              <Space>
              <Text strong style={{ fontSize: 18 }}>Grading Groups</Text>
                              </Space>
                            }
                          >
          <GradingGroupTable
            dataSource={flattenGradingGroups(groupedByCourse)}
            onAssign={handleOpenAssign}
            onDelete={handleDeleteGroup}
                            />
                          </Card>
      {isCreateModalOpen && (
        <CreateGradingGroupModal
          open={isCreateModalOpen}
          onCancel={handleModalCancel}
          onOk={handleModalOk}
          allLecturers={allLecturers}
          existingGroups={allGroups}
          gradingGroupToSemesterMap={gradingGroupToSemesterMap}
          assessmentTemplatesMap={allAssessmentTemplates}
          courseElementsMap={allCourseElements}
        />
      )}
      {isAssignModalOpen && selectedGroup && (
        <AssignSubmissionsModal
          open={isAssignModalOpen}
          onCancel={handleModalCancel}
          onOk={handleModalOk}
          group={selectedGroup}
          allGroups={allGroups}
        />
      )}
      </div>
    </>
  );
};
export default function GradingGroupsPage() {
  return (
    <App>
      <GradingGroupsPageContent />
    </App>
  );
}