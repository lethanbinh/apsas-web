"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./Tasks.module.css";
import { useLecturer } from "@/hooks/useLecturer";
import {
  assignRequestService,
  AssignRequestItem,
} from "@/services/assignRequestService";
import { Spin, Select } from "antd";
import { LecturerTaskContent } from "@/components/lecturer/LecturerTaskContent";

const getStatusTag = (status: number) => {
  switch (status) {
    case 1:
      return <span className={styles["status-tag-pending"]}>Pending</span>;
    case 2:
      return <span className={styles["status-tag-accepted"]}>Accepted</span>;
    case 3:
      return <span className={styles["status-tag-rejected"]}>Rejected</span>;
    case 4:
      return <span className={styles["status-tag-progress"]}>In Progress</span>;
    case 5:
      return <span className={styles["status-tag-completed"]}>Completed</span>;
    default:
      return <span className={styles["status-tag"]}>Unknown</span>;
  }
};

const TasksPage = () => {
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({});
  const [openAssignments, setOpenAssignments] = useState<
    Record<string, boolean>
  >({});
  const { lecturerId, isLoading: isLecturerLoading } = useLecturer();
  const [allTasks, setAllTasks] = useState<AssignRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>("all");

  useEffect(() => {
    if (isLecturerLoading) {
      return;
    }
    if (!lecturerId) {
      setIsLoading(false);
      return;
    }

    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const response = await assignRequestService.getAssignRequests({
          lecturerId: Number(lecturerId),
          pageNumber: 1,
          pageSize: 100,
        });
        setAllTasks(response.items);
      } catch (err: any) {
        console.error("Failed to fetch tasks:", err);
        setError("Failed to load tasks.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [lecturerId, isLecturerLoading]);

  const semesterOptions = useMemo(() => {
    const uniqueSemesters = [
      ...new Set(allTasks.map((task) => task.semesterName)),
    ];
    const options = uniqueSemesters.map((semester) => ({
      label: semester,
      value: semester,
    }));
    return [{ label: "All Semesters", value: "all" }, ...options];
  }, [allTasks]);

  const filteredTasks = useMemo(() => {
    if (selectedSemester === "all") {
      return allTasks;
    }
    return allTasks.filter((task) => task.semesterName === selectedSemester);
  }, [allTasks, selectedSemester]);

  const groupedByCourse = useMemo(() => {
    return filteredTasks.reduce((acc, task) => {
      const course = task.courseName || "Uncategorized";
      if (!acc[course]) {
        acc[course] = [];
      }
      acc[course].push(task);
      return acc;
    }, {} as Record<string, AssignRequestItem[]>);
  }, [filteredTasks]);

  const toggleCourse = (courseName: string) => {
    setOpenCourses((prev) => ({ ...prev, [courseName]: !prev[courseName] }));
  };

  const toggleAssignment = (taskId: string) => {
    setOpenAssignments((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  if (isLoading || isLecturerLoading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Tasks</h1>
        <p style={{ textAlign: "center", color: "red" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Tasks</h1>

      <Select
        value={selectedSemester}
        onChange={(value) => setSelectedSemester(value)}
        options={semesterOptions}
        style={{ width: 240, marginBottom: "20px" }}
        placeholder="Filter by semester"
      />

      {filteredTasks.length === 0 ? (
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          No tasks found for the selected semester.
        </p>
      ) : (
        Object.keys(groupedByCourse).map((courseName) => (
          <div className={styles["task-section"]} key={courseName}>
            <div
              className={styles["task-header"]}
              onClick={() => toggleCourse(courseName)}
            >
              <div className={styles["task-title"]}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                {courseName}
              </div>
              <div className={styles["task-meta"]}>
                <span>{groupedByCourse[courseName].length} Tasks</span>
                <svg
                  className={`${styles["question-dropdown-arrow"]} ${
                    openCourses[courseName] ? styles.rotate : ""
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
            {openCourses[courseName] && (
              <div
                className={`${styles["task-content"]} ${styles["nested-content"]}`}
              >
                {groupedByCourse[courseName].map((task) => (
                  <div className={styles["sub-task-section"]} key={task.id}>
                    <div
                      className={styles["task-header"]}
                      onClick={() => toggleAssignment(task.id.toString())}
                    >
                      <div className={styles["task-title"]}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        {task.courseElementName}
                      </div>
                      {getStatusTag(task.status)}
                      <button className={styles["export-button"]}>
                        Export
                      </button>
                      <svg
                        className={`${styles["question-dropdown-arrow"]} ${
                          openAssignments[task.id.toString()]
                            ? styles.rotate
                            : ""
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                    {openAssignments[task.id.toString()] && (
                      <LecturerTaskContent
                        task={task}
                        lecturerId={Number(lecturerId)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default TasksPage;
