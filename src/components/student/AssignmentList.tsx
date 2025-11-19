"use client";

import { LinkOutlined } from "@ant-design/icons";
import { Alert, App, Collapse, Spin, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import styles from "./AssignmentList.module.css";

import { AssessmentFile, assessmentFileService } from "@/services/assessmentFileService";
import { ClassAssessment, classAssessmentService } from "@/services/classAssessmentService";
import { classService } from "@/services/classService";
import { CourseElement, courseElementService } from "@/services/courseElementService";
import { assessmentTemplateService, AssessmentTemplate } from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";
import { AssignmentItem } from "./AssignmentItem";
import { AssignmentData } from "./data";

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
  const requirementFileObj = files.find(f => f.fileTemplate === 0);
  const databaseFileObj = files.find(f => f.fileTemplate === 1);
  const requirementFile = requirementFileObj?.name || "";
  const databaseFile = databaseFileObj?.name || "";

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
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchAssignments = async () => {
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
          (el) => el.semesterCourseId === semesterCourseId && !isPracticalExam(el) && !isLab(el)
        );

        // 3) Fetch assign requests and filter by status = 5 (Approved)
        let approvedAssignRequestIds = new Set<number>();
        let approvedCourseElementIds = new Set<number>();
        let approvedAssignRequestByCourseElementMap = new Map<number, number>();
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
              approvedAssignRequestByCourseElementMap.set(ar.courseElementId, ar.id);
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
        let templateToFilesMap = new Map<number, AssessmentFile[]>();
        
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
          
          // Fetch files for all approved templates
          const filesPromises = approvedTemplates.map(async (template) => {
          try {
            const filesRes = await assessmentFileService.getFilesForTemplate({
                assessmentTemplateId: template.id,
              pageNumber: 1,
              pageSize: 100,
            });
              return { templateId: template.id, files: filesRes.items };
          } catch (err) {
              console.error(`Failed to fetch files for template ${template.id}:`, err);
              return { templateId: template.id, files: [] };
          }
        });
        
        const filesResults = await Promise.all(filesPromises);
        filesResults.forEach(({ templateId, files }) => {
          templateToFilesMap.set(templateId, files);
        });
        } catch (err) {
          console.error("Failed to fetch assessment templates:", err);
          // Continue without filtering if templates cannot be fetched
        }

        // 5) Fetch class assessments for this class
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

        // 6) Map all course elements and files (don't filter course elements)
        // Logic same as lecturer: find template by classAssessment.assessmentTemplateId or courseElementId
        const filesByCourseElement = new Map<number, AssessmentFile[]>();
        
        for (const element of classElements) {
          const classAssessment = classAssessmentMap.get(element.id);
          let approvedTemplate: AssessmentTemplate | undefined;
          
          // Find approved template (same logic as lecturer)
          if (classAssessment?.assessmentTemplateId) {
            // First try: find template by classAssessment's assessmentTemplateId in approved templates
            approvedTemplate = approvedTemplateByIdMap.get(classAssessment.assessmentTemplateId);
          }
          
          // Second try: if no template found via classAssessment, find by courseElementId
          if (!approvedTemplate) {
            approvedTemplate = approvedTemplateByCourseElementMap.get(element.id);
          }
          
          // Map files from the approved template if found
          if (approvedTemplate) {
            const files = templateToFilesMap.get(approvedTemplate.id) || [];
            filesByCourseElement.set(element.id, files);
          }
          }
          
        // 7) Map all course elements to AssignmentData
        // Logic same as lecturer: 
        // 1. If classAssessment exists, find template by classAssessment.assessmentTemplateId in approved templates
        // 2. If no classAssessment or template not found, find template by courseElementId in approved templates
        // Only use classAssessment if approved template exists AND matches classAssessment's template
        const mappedAssignments = classElements.map((el) => {
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
              return mapCourseElementToAssignmentData(el, filesByCourseElement, classAssessmentMap, Number(cls.id));
            } else {
              // If approved template exists but classAssessment doesn't match, don't use classAssessment
              // But still show the course element (just without deadline)
              return mapCourseElementToAssignmentData(el, filesByCourseElement, new Map(), Number(cls.id));
            }
          } else {
            // If no approved template found, don't use classAssessment
            return mapCourseElementToAssignmentData(el, filesByCourseElement, new Map(), Number(cls.id));
          }
        });

        setAssignments(mappedAssignments);
      } catch (err: any) {
        console.error("Failed to fetch assignments:", err);
        setError(err.message || "Failed to load assignments.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignments();
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
