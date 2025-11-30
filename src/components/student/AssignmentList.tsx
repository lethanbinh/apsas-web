"use client";

import { LinkOutlined } from "@ant-design/icons";
import { Alert, App, Collapse, Spin, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./AssignmentList.module.css";

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

// Helper function to check if a course element is a Practical Exam based on name
function isPracticalExam(element: CourseElement): boolean {
  const name = (element.name || "").toLowerCase();
  const keywords = [
    "exam",
    "pe",
    "practical exam",
    "practical",
    "test",
    "kiểm tra thực hành",
    "thi thực hành",
    "bài thi",
    "bài kiểm tra",
    "thực hành",
  ];
  return keywords.some((keyword) => name.includes(keyword));
}

// Helper function to check if a course element is a Lab based on name
function isLab(element: CourseElement): boolean {
  const name = (element.name || "").toLowerCase();
  const keywords = [
    "lab",
    "laboratory",
    "thực hành",
    "bài thực hành",
    "lab session",
    "lab work",
  ];
  return keywords.some((keyword) => name.includes(keyword));
}

function mapCourseElementToAssignmentData(
  element: CourseElement,
  filesMap: Map<number, AssessmentFile[]>,
  classAssessmentMap: Map<number, ClassAssessment>,
  classId: number
): AssignmentData {
  const classAssessment = classAssessmentMap.get(element.id);
  let deadline: string | undefined = undefined;
  let startAt = dayjs().toISOString();
  
  // Get deadline from classAssessment only (last set deadline)
  // If no classAssessment, there is no deadline
  try {
    if (classAssessment?.endAt) {
      deadline = classAssessment.endAt;
      startAt = classAssessment.startAt || dayjs().toISOString();
    }
  } catch (error) {
    console.error("Error parsing deadline:", error);
    // Continue without deadline
  }
  
  const files = filesMap.get(element.id) || [];
  
  // Get requirement file and database file if available
  // Note: fileTemplate = 0 is Database, fileTemplate = 1 is Postman (hidden from students), fileTemplate = 2 is Custom
  const requirementFileObj = files.find(f => f.fileTemplate === 0);
  // Don't get Postman files (fileTemplate = 1) for students - only get database file (fileTemplate = 0)
  // If there are multiple files with fileTemplate = 0, we'll use the first one for both requirement and database
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

  useEffect(() => {
      const classId = localStorage.getItem("selectedClassId");
    setSelectedClassId(classId);
  }, []);

  // Fetch class data
  const { data: classData, isLoading: isLoadingClass } = useQuery({
    queryKey: queryKeys.classes.detail(selectedClassId!),
    queryFn: () => classService.getClassById(selectedClassId!),
    enabled: !!selectedClassId,
  });

  // Fetch all course elements
  const { data: allElements = [] } = useQuery({
    queryKey: queryKeys.courseElements.list({}),
    queryFn: () => courseElementService.getCourseElements({
          pageNumber: 1,
          pageSize: 1000,
    }),
  });

  // Fetch assign requests
  const { data: assignRequestResponse } = useQuery({
    queryKey: queryKeys.assignRequests.lists(),
    queryFn: () => assignRequestService.getAssignRequests({
            pageNumber: 1,
            pageSize: 1000,
    }),
  });

  // Fetch templates
  const { data: templateResponse } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({}),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
  });

  // Fetch class assessments
  const { data: classAssessmentRes } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(selectedClassId!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: Number(selectedClassId!),
            pageNumber: 1,
            pageSize: 1000,
    }),
    enabled: !!selectedClassId,
  });

  // Process approved assign requests
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

  // Fetch files for approved templates
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

  // Process data
  const { assignments, error } = useMemo(() => {
    if (!classData || !allElements.length) {
      return { assignments: [], error: !selectedClassId ? "No class selected. Please select a class first." : null };
    }

    const semesterCourseId = parseInt(classData.semesterCourseId, 10);
    const classElements = allElements.filter(
      (el) => el.semesterCourseId === semesterCourseId && !isPracticalExam(el) && !isLab(el)
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

  return (
    <div className={styles.wrapper}>
      <Title
        level={2}
        style={{
          fontWeight: 700,
          color: "#2F327D !important",
          marginBottom: "20px",
        }}
      >
        Assignments
      </Title>
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
