"use client";

import { AssessmentTemplate, assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";
import { ClassAssessment, classAssessmentService } from "@/services/classAssessmentService";
import { classService } from "@/services/classService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { LinkOutlined } from "@ant-design/icons";
import { Alert, Collapse, Spin, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AssignmentItem } from "./AssignmentItem";
import styles from "./AssignmentList.module.css";
import { AssignmentData } from "./data";
import { queryKeys } from "@/lib/react-query";

const { Title, Text } = Typography;

// Helper function to check if a course element is a Lab based on elementType
function isLab(element: CourseElement): boolean {
  return element.elementType === 1; // 1: Lab
}

function mapCourseElementToLabData(
  element: CourseElement,
  classAssessmentMap: Map<number, ClassAssessment>
): AssignmentData {
  const classAssessment = classAssessmentMap.get(element.id);
  const now = dayjs();
  let status = "Upcoming Lab";
  let deadline: string | undefined = undefined;
  let startAt = dayjs().toISOString();
  let assessmentTemplateId: number | undefined;

  // Get deadline from classAssessment only if it exists (last set deadline)
  // If no classAssessment, there is no deadline
  try {
    if (classAssessment?.endAt) {
      deadline = classAssessment.endAt;
      startAt = classAssessment.startAt || dayjs().toISOString();
      assessmentTemplateId = classAssessment.assessmentTemplateId;
    }
  } catch (error) {
    console.error("Error parsing deadline:", error);
    // Continue without deadline
  }

  // Determine status based on deadline
  if (deadline) {
    const endDate = dayjs(deadline);
    const startDate = dayjs(startAt);
    
    if (now.isBefore(startDate)) {
      status = "Upcoming Lab";
    } else if (now.isAfter(endDate)) {
      status = "Completed Lab";
    } else {
      status = "Active Lab";
    }
  } else {
    status = "No Deadline";
  }

  return {
    id: element.id.toString(),
    status: status,
    title: element.name || "Lab",
    date: deadline,
    description: element.description || "No description available",
    requirementContent: [
      { type: "heading", content: element.name || "Lab Details" },
      { type: "paragraph", content: element.description || "" },
    ],
    requirementFile: "",
    requirementFileUrl: "",
    databaseFile: undefined,
    databaseFileUrl: "",
    totalScore: "N/A",
    overallFeedback: "",
    gradeCriteria: [],
    suggestionsAvoid: "",
    suggestionsImprove: "",
    submissions: [],
    assessmentTemplateId: assessmentTemplateId,
    startAt: startAt,
    classAssessmentId: classAssessment?.id,
  };
}

export default function Labs() {
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

  // Process approved assign requests and templates
  const { approvedTemplateByCourseElementMap, approvedTemplateByIdMap } = useMemo(() => {
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
    
    return { approvedTemplateByCourseElementMap, approvedTemplateByIdMap };
  }, [assignRequestResponse, templateResponse]);

  // Process data
  const { labs, error } = useMemo(() => {
    if (!classData || !allElements.length) {
      return { labs: [], error: !selectedClassId ? "No class selected. Please select a class first." : null };
    }

    const semesterCourseId = parseInt(classData.semesterCourseId, 10);
    const classElements = allElements.filter(
      (el) => el.semesterCourseId === semesterCourseId && isLab(el)
    );

    const classAssessmentMap = new Map<number, ClassAssessment>();
    for (const assessment of (classAssessmentRes?.items || [])) {
            if (assessment.courseElementId) {
              classAssessmentMap.set(assessment.courseElementId, assessment);
            }
        }

        const mappedLabs = classElements.map((el) => {
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
              return mapCourseElementToLabData(el, classAssessmentMap);
            } else {
              return mapCourseElementToLabData(el, new Map());
            }
          } else {
            return mapCourseElementToLabData(el, new Map());
          }
        });

    return { labs: mappedLabs, error: null };
  }, [classData, allElements, classAssessmentRes, approvedTemplateByCourseElementMap, approvedTemplateByIdMap, selectedClassId]);

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
          color: "#2F327D",
          marginBottom: "20px",
        }}
      >
        Labs
      </Title>
      {labs.length === 0 ? (
        <Alert message="No labs found" description="There are no labs for this class." type="info" />
      ) : (
        <Collapse
          accordion
          bordered={false}
          className={styles.collapse}
          defaultActiveKey={labs.length > 0 ? [labs[0].id] : []}
          items={labs.map((item) => ({
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
            children: <AssignmentItem data={item} isLab={true} />,
          }))}
        />
      )}
    </div>
  );
}

