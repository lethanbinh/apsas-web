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
import { ExamSession, examSessionService } from "@/services/examSessionService";
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

function mapCourseElementToAssignmentData(
  element: CourseElement,
  sessionMap: Map<number, ExamSession[]>,
  filesMap: Map<number, AssessmentFile[]>,
  classAssessmentMap: Map<number, ClassAssessment>,
  classId: number
): AssignmentData {
  const sessions = sessionMap.get(element.id) || [];
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
    status: classAssessment || sessions.length > 0 ? "Active Assignment" : "Basic Assignment",
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
  const { message } = App.useApp();
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
          (el) => el.semesterCourseId === semesterCourseId && !isPracticalExam(el)
        );

        // 3) Load exam sessions for this class to attach deadlines and get assessmentTemplateIds
        let sessionsByCourseElement = new Map<number, ExamSession[]>();
        let assessmentTemplateIds = new Set<number>();
        
        try {
          const sessionRes = await examSessionService.getExamSessions({
            classId: Number(cls.id),
            pageNumber: 1,
            pageSize: 1000,
          });
          
          for (const s of sessionRes.items) {
            const arr = sessionsByCourseElement.get(s.courseElementId) || [];
            arr.push(s);
            sessionsByCourseElement.set(s.courseElementId, arr);
            if (s.assessmentTemplateId) {
              assessmentTemplateIds.add(s.assessmentTemplateId);
            }
          }
        } catch (err) {
          console.error("Failed to fetch exam sessions:", err);
          // Continue without exam sessions
        }

        // 4) Fetch assessment files for all assessment templates
        const filesByCourseElement = new Map<number, AssessmentFile[]>();
        const filesPromises = Array.from(assessmentTemplateIds).map(async (templateId) => {
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

        // 5) Fetch class assessments for this class (wrap in try-catch to not block other data)
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
          // Continue without class assessments - still show course elements
        }

        // 6) Map files to course elements via exam sessions
        for (const element of classElements) {
          const sessions = sessionsByCourseElement.get(element.id) || [];
          const allFiles: AssessmentFile[] = [];
          for (const session of sessions) {
            if (session.assessmentTemplateId) {
              const files = templateToFilesMap.get(session.assessmentTemplateId) || [];
              allFiles.push(...files);
            }
          }
          // Remove duplicates by id
          const uniqueFiles = Array.from(
            new Map(allFiles.map(f => [f.id, f])).values()
          );
          filesByCourseElement.set(element.id, uniqueFiles);
        }

        // 7) Map to AssignmentData
        const mappedAssignments = classElements.map((el) =>
          mapCourseElementToAssignmentData(el, sessionsByCourseElement, filesByCourseElement, classAssessmentMap, Number(cls.id))
        );

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
