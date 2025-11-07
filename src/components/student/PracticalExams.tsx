"use client";

import React, { useState, useEffect } from "react";
import { App, Typography, Collapse, Spin, Alert } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import styles from "./AssignmentList.module.css";
import dayjs from "dayjs";
import { AssignmentData } from "./data";
import { DeadlinePopover } from "./DeadlinePopover";
import { AssignmentItem } from "./AssignmentItem";
import { examSessionService, ExamSession } from "@/services/examSessionService";
import { useStudent } from "@/hooks/useStudent";

const { Title, Text } = Typography;
const { Panel } = Collapse;

function mapExamSessionToAssignmentData(
  exam: ExamSession
): AssignmentData {
  const now = dayjs();
  const endDate = dayjs(exam.endAt);
  const startDate = dayjs(exam.startAt);
  let status = "Upcoming Exam";
  
  if (now.isBefore(startDate)) {
    status = "Upcoming Exam";
  } else if (now.isAfter(endDate)) {
    status = "Completed Exam";
  } else {
    status = "Active Exam";
  }
  
  return {
    id: exam.id.toString(),
    status: status,
    title: exam.assessmentTemplateName || exam.courseElementName || "Practical Exam",
    date: exam.endAt,
    description: exam.assessmentTemplateDescription || exam.courseElementName || "No description available",
    requirementContent: [
      { type: "heading", content: exam.assessmentTemplateName || "Exam Details" },
      { type: "paragraph", content: exam.assessmentTemplateDescription || "" },
    ],
    requirementFile: "",
    totalScore: "N/A",
    overallFeedback: "",
    gradeCriteria: [],
    suggestionsAvoid: "",
    suggestionsImprove: "",
    submissions: [],
  };
}

export default function PracticalExams() {
  const [exams, setExams] = useState<AssignmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { studentId, isLoading: isStudentLoading } = useStudent();

  useEffect(() => {
    const fetchExams = async () => {
      const classId = localStorage.getItem("selectedClassId");
      
      if (!classId) {
        setError("No class selected. Please select a class first.");
        setIsLoading(false);
        return;
      }

      if (!studentId) {
        if (!isStudentLoading) {
          setError("Student information not found.");
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await examSessionService.getExamSessions({
          classId: parseInt(classId, 10),
          studentId: studentId,
          pageNumber: 1,
          pageSize: 1000,
        });
        
        const mappedExams = response.items.map(mapExamSessionToAssignmentData);
        setExams(mappedExams);
      } catch (err: any) {
        console.error("Failed to fetch exams:", err);
        setError(err.message || "Failed to load exams.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();
  }, [studentId, isStudentLoading]);

  const handleDeadlineSave = (id: string, newDate: dayjs.Dayjs | null) => {
    if (!newDate) return;
    setExams((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, date: newDate.toISOString() } : item
      )
    );
  };

  if (isLoading || isStudentLoading) {
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
                  <DeadlinePopover
                    id={item.id}
                    date={item.date}
                    onSave={handleDeadlineSave}
                  />
                </div>
              }
            >
              <AssignmentItem data={item} />
            </Panel>
          ))}
        </Collapse>
      )}
    </div>
  );
}
