"use client";

import React, { useState, useEffect } from "react";
import { App, Typography, Collapse, Spin, Alert } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import styles from "./AssignmentList.module.css";
import dayjs from "dayjs";

import { AssignmentData } from "./data";
import { DeadlinePopover } from "./DeadlinePopover";
import { AssignmentItem } from "./AssignmentItem";
import { classService } from "@/services/classService";
import { courseElementService, CourseElement } from "@/services/courseElementService";
import { examSessionService, ExamSession } from "@/services/examSessionService";

const { Title, Text } = Typography;
const { Panel } = Collapse;

function mapCourseElementToAssignmentData(
  element: CourseElement,
  sessionMap: Map<number, ExamSession[]>
): AssignmentData {
  const sessions = sessionMap.get(element.id) || [];
  const deadline = sessions.length > 0 ? sessions[0].endAt : dayjs().add(7, "day").toISOString();

  return {
    id: element.id.toString(),
    status: sessions.length > 0 ? "Active Assignment" : "Basic Assignment",
    title: element.name || "Assignment",
    date: deadline,
    description: element.description || "No description available",
    requirementContent: [
      { type: "heading", content: element.name || "Assignment Details" },
      { type: "paragraph", content: element.description || "" },
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
          (el) => el.semesterCourseId === semesterCourseId
        );

        // 3) Optionally load exam sessions for this class to attach deadlines if any
        const sessionRes = await examSessionService.getExamSessions({
          classId: Number(cls.id),
          pageNumber: 1,
          pageSize: 1000,
        });
        const sessionsByCourseElement = new Map<number, ExamSession[]>();
        for (const s of sessionRes.items) {
          const arr = sessionsByCourseElement.get(s.courseElementId) || [];
          arr.push(s);
          sessionsByCourseElement.set(s.courseElementId, arr);
        }

        // 4) Map to AssignmentData
        const mappedAssignments = classElements.map((el) =>
          mapCourseElementToAssignmentData(el, sessionsByCourseElement)
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

  const handleDeadlineSave = (id: string, newDate: dayjs.Dayjs | null) => {
    if (!newDate) return;
    setAssignments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, date: newDate.toISOString() } : item
      )
    );
  };

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
        >
          {assignments.map((item) => (
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
