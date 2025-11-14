"use client";

import React, { useState, useEffect } from "react";
import { App, Typography, Collapse, Spin, Alert } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import styles from "./AssignmentList.module.css";
import dayjs from "dayjs";
import { AssignmentData } from "./data";
import { AssignmentItem } from "./AssignmentItem";
import { classService } from "@/services/classService";
import { courseElementService, CourseElement } from "@/services/courseElementService";
import { classAssessmentService, ClassAssessment } from "@/services/classAssessmentService";
import { assessmentTemplateService, AssessmentTemplate } from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";

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

function mapCourseElementToExamData(
  element: CourseElement,
  classAssessmentMap: Map<number, ClassAssessment>
): AssignmentData {
  const classAssessment = classAssessmentMap.get(element.id);
  const now = dayjs();
  let status = "Upcoming Exam";
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
      status = "Upcoming Exam";
    } else if (now.isAfter(endDate)) {
      status = "Completed Exam";
    } else {
      status = "Active Exam";
    }
  } else {
    status = "No Deadline";
  }

  return {
    id: element.id.toString(),
    status: status,
    title: element.name || "Practical Exam",
    date: deadline,
    description: element.description || "No description available",
    requirementContent: [
      { type: "heading", content: element.name || "Exam Details" },
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

export default function PracticalExams() {
  const [exams, setExams] = useState<AssignmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExams = async () => {
      const classId = localStorage.getItem("selectedClassId");
      
      if (!classId) {
        setError("No class selected. Please select a class first.");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 1) Get class info to find semesterCourseId
        const cls = await classService.getClassById(classId);
        const semesterCourseId = parseInt(cls.semesterCourseId, 10);

        // 2) Get all course elements and filter by this class's semesterCourseId
        const allElements = await courseElementService.getCourseElements({
          pageNumber: 1,
          pageSize: 1000,
        });
        const classElements = allElements.filter(
          (el) => el.semesterCourseId === semesterCourseId && isPracticalExam(el)
        );

        // 3) Fetch assign requests and filter by status = 5 (Approved)
        let approvedAssignRequestIds = new Set<number>();
        let approvedCourseElementIds = new Set<number>();
        try {
          const assignRequestResponse = await assignRequestService.getAssignRequests({
            pageNumber: 1,
            pageSize: 1000,
          });
          // Only include assign requests with status = 5 (Approved/COMPLETED)
          const approvedAssignRequests = assignRequestResponse.items.filter(ar => ar.status === 5);
          approvedAssignRequestIds = new Set(approvedAssignRequests.map(ar => ar.id));
          // Create map of courseElementIds that have approved assign requests
          approvedAssignRequests.forEach(ar => {
            if (ar.courseElementId) {
              approvedCourseElementIds.add(ar.courseElementId);
            }
          });
        } catch (err) {
          console.error("Failed to fetch assign requests:", err);
          // Continue without filtering if assign requests cannot be fetched
        }

        // 4) Fetch assessment templates and filter by approved assign request IDs
        let approvedTemplateIds = new Set<number>();
        let approvedTemplates: AssessmentTemplate[] = [];
        let approvedTemplateByCourseElementMap = new Map<number, AssessmentTemplate>();
        let approvedTemplateByIdMap = new Map<number, AssessmentTemplate>();
        try {
          const templateResponse = await assessmentTemplateService.getAssessmentTemplates({
            pageNumber: 1,
            pageSize: 1000,
          });
          // Only include templates with assignRequestId in approved assign requests (status = 5)
          // Must have assignRequestId AND it must be in the approved assign requests list
          approvedTemplates = templateResponse.items.filter(t => {
            if (!t.assignRequestId) {
              return false; // Skip templates without assignRequestId
            }
            return approvedAssignRequestIds.has(t.assignRequestId);
          });
          approvedTemplateIds = new Set(approvedTemplates.map(t => t.id));
          // Create map by courseElementId for quick lookup (same as lecturer)
          approvedTemplates.forEach(t => {
            if (t.courseElementId) {
              approvedTemplateByCourseElementMap.set(t.courseElementId, t);
            }
            // Also create map by template id for quick lookup
            approvedTemplateByIdMap.set(t.id, t);
          });
        } catch (err) {
          console.error("Failed to fetch assessment templates:", err);
          // Continue without filtering if templates cannot be fetched
        }

        // 5) Fetch class assessments for this class to get last set deadline
        let classAssessmentMap = new Map<number, ClassAssessment>();
        try {
          const classAssessmentRes = await classAssessmentService.getClassAssessments({
            classId: Number(cls.id),
            pageNumber: 1,
            pageSize: 1000,
          });
          for (const assessment of classAssessmentRes.items) {
            if (assessment.courseElementId) {
              classAssessmentMap.set(assessment.courseElementId, assessment);
            }
          }
        } catch (err) {
          console.error("Failed to fetch class assessments:", err);
          // Continue without class assessments
        }

        // 6) Map all course elements to AssignmentData (don't filter course elements)
        // Logic same as lecturer: 
        // 1. If classAssessment exists, find template by classAssessment.assessmentTemplateId in approved templates
        // 2. If no classAssessment or template not found, find template by courseElementId in approved templates
        // Only use classAssessment if approved template exists AND matches classAssessment's template
        const mappedExams = classElements.map((el) => {
          const classAssessment = classAssessmentMap.get(el.id);
          let approvedTemplate: AssessmentTemplate | undefined;
          
          // Find approved template (same logic as lecturer)
          if (classAssessment?.assessmentTemplateId) {
            // First try: find template by classAssessment's assessmentTemplateId in approved templates
            approvedTemplate = approvedTemplateByIdMap.get(classAssessment.assessmentTemplateId);
          }
          
          // Second try: if no template found via classAssessment, find by courseElementId
          if (!approvedTemplate) {
            approvedTemplate = approvedTemplateByCourseElementMap.get(el.id);
          }
          
          // Only use classAssessment if approved template exists AND matches classAssessment's template
          if (approvedTemplate) {
            // Use classAssessment only if it matches the approved template
            if (classAssessment?.assessmentTemplateId === approvedTemplate.id) {
              return mapCourseElementToExamData(el, classAssessmentMap);
            } else {
              // If approved template exists but classAssessment doesn't match, don't use classAssessment
              // But still show the course element (just without deadline)
              return mapCourseElementToExamData(el, new Map());
            }
          } else {
            // If no approved template found, don't use classAssessment
            return mapCourseElementToExamData(el, new Map());
          }
        });

        setExams(mappedExams);
      } catch (err: any) {
        console.error("Failed to fetch exams:", err);
        setError(err.message || "Failed to load exams.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();
  }, []);


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
        Practical Exams
      </Title>
      {exams.length === 0 ? (
        <Alert message="No exams found" description="There are no practical exams for this class." type="info" />
      ) : (
        <Collapse
          accordion
          bordered={false}
          className={styles.collapse}
          defaultActiveKey={exams.length > 0 ? [exams[0].id] : []}
          items={exams.map((item) => ({
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
            children: <AssignmentItem data={item} isExam={true} />,
          }))}
        />
      )}
    </div>
  );
}
