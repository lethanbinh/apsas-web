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
import { examSessionService, ExamSession } from "@/services/examSessionService";
import { classAssessmentService, ClassAssessment } from "@/services/classAssessmentService";

const { Title, Text } = Typography;
const { Panel } = Collapse;

function mapCourseElementToExamData(
  element: CourseElement,
  sessionMap: Map<number, ExamSession[]>,
  classAssessmentMap: Map<number, ClassAssessment>
): AssignmentData {
  const sessions = sessionMap.get(element.id) || [];
  const classAssessment = classAssessmentMap.get(element.id);
  const now = dayjs();
  let status = "Upcoming Exam";
  let deadline: string | undefined = undefined;
  let startAt = dayjs().toISOString();
  let examSessionId: number | undefined;
  let assessmentTemplateId: number | undefined;

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

  // Get examSessionId and assessmentTemplateId from first session if available
  if (sessions.length > 0) {
    const session = sessions[0];
    examSessionId = session.id;
    assessmentTemplateId = session.assessmentTemplateId;
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
    examSessionId: examSessionId,
    assessmentTemplateId: assessmentTemplateId,
    startAt: startAt,
    classAssessmentId: classAssessment?.id,
  };
}

export default function PracticalExams() {
  const { message } = App.useApp();
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
          (el) => el.semesterCourseId === semesterCourseId
        );

        // 3) Load exam sessions for this class to attach deadlines
        let sessionsByCourseElement = new Map<number, ExamSession[]>();
        
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
          }
        } catch (err) {
          console.error("Failed to fetch exam sessions:", err);
          // Continue without exam sessions
        }

        // 4) Fetch class assessments for this class to get last set deadline
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

        // 5) Map to AssignmentData
        const mappedExams = classElements.map((el) =>
          mapCourseElementToExamData(el, sessionsByCourseElement, classAssessmentMap)
        );

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
        >
          {exams.map((item) => (
            <Panel
              key={item.id}
              header={
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
              }
            >
              <AssignmentItem data={item} isExam={true} />
            </Panel>
          ))}
        </Collapse>
      )}
    </div>
  );
}
