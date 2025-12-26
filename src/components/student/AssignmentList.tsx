"use client";
import { DownloadOutlined, LinkOutlined } from "@ant-design/icons";
import { Alert, App, Button, Collapse, Space, Spin, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./AssignmentList.module.css";
import { handleDownloadAll, AssignmentWithSubmissions } from "./utils/downloadAll";
import { useStudent } from "@/hooks/useStudent";
import { submissionService } from "@/services/submissionService";
import { AssessmentFile, assessmentFileService } from "@/services/assessmentFileService";
import { ClassAssessment, classAssessmentService } from "@/services/classAssessmentService";
import { classService } from "@/services/classService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { assessmentTemplateService, AssessmentTemplate } from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";
import { AssignmentItem } from "./AssignmentItem";
import { AssignmentData } from "./data";
import { queryKeys } from "@/lib/react-query";
const { Title, Text } = Typography;
function mapCourseElementToAssignmentData(
  element: CourseElement,
  filesMap: Map<number, AssessmentFile[]>,
  classAssessmentMap: Map<number, ClassAssessment>,
  classId: number
): AssignmentData {
  const classAssessment = classAssessmentMap.get(element.id);
  let deadline: string | undefined = undefined;
  let startAt = dayjs().toISOString();
  try {
    if (classAssessment?.endAt) {
      deadline = classAssessment.endAt;
      startAt = classAssessment.startAt || dayjs().toISOString();
    }
  } catch (error) {
    console.error("Error parsing deadline:", error);
  }
  const files = filesMap.get(element.id) || [];
  const requirementFileObj = files.find(f => f.fileTemplate === 0);
  const databaseFileObj = files.find(f => f.fileTemplate === 0 && f.id !== requirementFileObj?.id) || requirementFileObj;
  const requirementFile = requirementFileObj?.name || "";
  const databaseFile = databaseFileObj && databaseFileObj.id !== requirementFileObj?.id ? databaseFileObj.name : "";
  return {
    id: element.id.toString(),
    status: classAssessment ? "Active Assignment" : "Basic Assignment",
    title: element.name || "Assignment",
    date: deadline,
    description: element.description || "No description available",
    requirementContent: [
      { type: "heading", content: element.name || "Assignment Details" },
      { type: "paragraph", content: element.description || "" },
    ],
    requirementFile: requirementFile,
    requirementFileUrl: requirementFileObj?.fileUrl || "",
    databaseFile: databaseFile || undefined,
    databaseFileUrl: databaseFileObj?.fileUrl || "",
    totalScore: "N/A",
    overallFeedback: "",
    gradeCriteria: [],
    suggestionsAvoid: "",
    suggestionsImprove: "",
    submissions: [],
    classAssessmentId: classAssessment?.id,
    courseElementId: element.id,
    classId: classId,
    assessmentTemplateId: classAssessment?.assessmentTemplateId,
    startAt: startAt,
  };
}
export default function AssignmentList() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const { message } = App.useApp();
  const { studentId } = useStudent();
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    const classId = localStorage.getItem("selectedClassId");
    if (isMountedRef.current) {
    setSelectedClassId(classId);
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const { data: classData, isLoading: isLoadingClass } = useQuery({
    queryKey: queryKeys.classes.detail(selectedClassId!),
    queryFn: () => classService.getClassById(selectedClassId!),
    enabled: !!selectedClassId,
  });
  const { data: allElements = [] } = useQuery({
    queryKey: queryKeys.courseElements.list({}),
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });
  const { data: assignRequestResponse } = useQuery({
    queryKey: queryKeys.assignRequests.lists(),
    queryFn: () => assignRequestService.getAssignRequests({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });
  const { data: templateResponse } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({}),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });
  const { data: classAssessmentRes } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(selectedClassId!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: Number(selectedClassId!),
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!selectedClassId,
  });
  const { approvedAssignRequestIds, approvedTemplateByCourseElementMap, approvedTemplateByIdMap } = useMemo(() => {
    const approvedAssignRequests = (assignRequestResponse?.items || []).filter(ar => ar.status === 5);
    const approvedAssignRequestIds = new Set(approvedAssignRequests.map(ar => ar.id));
    const approvedTemplates = (templateResponse?.items || []).filter(t =>
      t.assignRequestId && approvedAssignRequestIds.has(t.assignRequestId)
    );
    const approvedTemplateByCourseElementMap = new Map<number, AssessmentTemplate>();
    const approvedTemplateByIdMap = new Map<number, AssessmentTemplate>();
    approvedTemplates.forEach(t => {
      if (t.courseElementId) {
        approvedTemplateByCourseElementMap.set(t.courseElementId, t);
      }
      approvedTemplateByIdMap.set(t.id, t);
    });
    return { approvedAssignRequestIds, approvedTemplateByCourseElementMap, approvedTemplateByIdMap };
  }, [assignRequestResponse, templateResponse]);
  const approvedTemplateIds = Array.from(approvedTemplateByIdMap.keys());
  const { data: filesData } = useQuery({
    queryKey: ['assessmentFiles', 'byTemplateIds', approvedTemplateIds],
    queryFn: async () => {
      const filesPromises = approvedTemplateIds.map(async (templateId) => {
        try {
          const filesRes = await assessmentFileService.getFilesForTemplate({
            assessmentTemplateId: templateId,
            pageNumber: 1,
            pageSize: 100,
          });
          return { templateId, files: filesRes.items };
        } catch (err) {
          console.error(`Failed to fetch files for template ${templateId}:`, err);
          return { templateId, files: [] };
        }
      });
      const filesResults = await Promise.all(filesPromises);
      const templateToFilesMap = new Map<number, AssessmentFile[]>();
      filesResults.forEach(({ templateId, files }) => {
        templateToFilesMap.set(templateId, files);
      });
      return templateToFilesMap;
    },
    enabled: approvedTemplateIds.length > 0,
  });
  const templateToFilesMap = filesData || new Map<number, AssessmentFile[]>();
  const { assignments, error } = useMemo(() => {
    if (!classData || !allElements.length) {
      return { assignments: [], error: !selectedClassId ? "No class selected. Please select a class first." : null };
    }
    const semesterCourseId = parseInt(classData.semesterCourseId, 10);
    const classElements = allElements.filter(
      (el) => el.semesterCourseId === semesterCourseId && el.elementType === 0
    );
    const classAssessmentMap = new Map<number, ClassAssessment>();
    for (const assessment of (classAssessmentRes?.items || [])) {
      if (assessment.courseElementId) {
        classAssessmentMap.set(assessment.courseElementId, assessment);
      }
    }
    const filesByCourseElement = new Map<number, AssessmentFile[]>();
    for (const element of classElements) {
      const classAssessment = classAssessmentMap.get(element.id);
      let approvedTemplate: AssessmentTemplate | undefined;
      if (classAssessment?.assessmentTemplateId) {
        approvedTemplate = approvedTemplateByIdMap.get(classAssessment.assessmentTemplateId);
      }
      if (!approvedTemplate) {
        approvedTemplate = approvedTemplateByCourseElementMap.get(element.id);
      }
      if (approvedTemplate) {
        const files = templateToFilesMap.get(approvedTemplate.id) || [];
        filesByCourseElement.set(element.id, files);
      }
    }
    const mappedAssignments = classElements.map((el) => {
      const classAssessment = classAssessmentMap.get(el.id);
      let approvedTemplate: AssessmentTemplate | undefined;
      if (classAssessment?.assessmentTemplateId) {
        approvedTemplate = approvedTemplateByIdMap.get(classAssessment.assessmentTemplateId);
      }
      if (!approvedTemplate) {
        approvedTemplate = approvedTemplateByCourseElementMap.get(el.id);
      }
      if (approvedTemplate) {
        if (classAssessment?.assessmentTemplateId === approvedTemplate.id) {
          return mapCourseElementToAssignmentData(el, filesByCourseElement, classAssessmentMap, Number(classData.id));
        } else {
          return mapCourseElementToAssignmentData(el, filesByCourseElement, new Map(), Number(classData.id));
        }
      } else {
        return mapCourseElementToAssignmentData(el, filesByCourseElement, new Map(), Number(classData.id));
      }
    });
    return { assignments: mappedAssignments, error: null };
  }, [classData, allElements, classAssessmentRes, approvedTemplateByCourseElementMap, approvedTemplateByIdMap, templateToFilesMap, selectedClassId]);
  const isLoading = isLoadingClass && !classData;
  if (isLoading) {
    return (
      <div className={styles.wrapper}>
        <Spin size="large" style={{ display: "block", textAlign: "center", padding: "50px" }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.wrapper}>
        <Alert message="Error" description={error} type="error" showIcon />
      </div>
    );
  }
  const handleDownloadAllClick = async () => {
    if (!studentId) {
      message.error("Student ID not found");
      return;
    }
    const assignmentsWithData: AssignmentWithSubmissions[] = await Promise.all(
      assignments.map(async (assignment) => {
        let submissions: any[] = [];
        let template = undefined;
        if (assignment.classAssessmentId) {
          try {
            submissions = await submissionService.getSubmissionList({
              studentId: studentId,
              classAssessmentId: assignment.classAssessmentId,
            });
          } catch (err) {
            console.error(`Failed to fetch submissions for assignment ${assignment.id}:`, err);
          }
        }
        if (assignment.assessmentTemplateId) {
          try {
            const templatesRes = await assessmentTemplateService.getAssessmentTemplates({
              pageNumber: 1,
              pageSize: 1000,
            });
            template = templatesRes.items.find(t => t.id === assignment.assessmentTemplateId);
          } catch (err) {
            console.error(`Failed to fetch template for assignment ${assignment.id}:`, err);
          }
        }
        return {
          assignment,
          template,
          submissions,
        };
      })
    );
    const assignmentsWithSubmissions = assignmentsWithData.filter(item => item.submissions.length > 0);
    handleDownloadAll(assignmentsWithSubmissions, message, false);
  };
  return (
    <div className={styles.wrapper}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <Title
          level={2}
          style={{
            fontWeight: 700,
            color: "#2F327D !important",
            margin: 0,
          }}
        >
          Assignments
        </Title>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleDownloadAllClick}
          size="large"
        >
          Download All
        </Button>
      </div>
      {assignments.length === 0 ? (
        <Alert message="No assignments found" description="There are no assignments for this class." type="info" />
      ) : (
        <Collapse
          accordion
          bordered={false}
          className={styles.collapse}
          defaultActiveKey={assignments.length > 0 ? [assignments[0].id] : []}
          items={assignments.map((item) => ({
            key: item.id,
            label: (
              <div className={styles.panelHeader}>
                <div>
                  <Text
                    type="secondary"
                    style={{ fontSize: "0.9rem", color: "#E86A92" }}
                  >
                    <LinkOutlined /> {item.status}
                  </Text>
                  <Title level={4} style={{ margin: "4px 0 0 0" }}>
                    {item.title}
                  </Title>
                </div>
              </div>
            ),
            children: <AssignmentItem data={item} />,
          }))}
        />
      )}
    </div>
  );
}