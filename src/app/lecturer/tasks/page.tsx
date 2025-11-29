"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./Tasks.module.css";
import { useLecturer } from "@/hooks/useLecturer";
import {
  assignRequestService,
  AssignRequestItem,
} from "@/services/assignRequestService";
import { Spin, Select, App } from "antd";
import { LecturerTaskContent } from "@/components/lecturer/LecturerTaskContent";
import { queryKeys } from "@/lib/react-query";

const getStatusTag = (status: number) => {
  // Map to 3 statuses: Pending (1,2,4), Approved (5), Rejected (3)
  switch (status) {
    case 1: // PENDING
    case 2: // ACCEPTED -> map to Pending
    case 4: // IN_PROGRESS -> map to Pending
      return <span className={styles["status-tag-pending"]}>Pending</span>;
    case 5: // COMPLETED -> Approved
      return <span className={styles["status-tag-completed"]}>Approved</span>;
    case 3: // REJECTED
      return <span className={styles["status-tag-rejected"]}>Rejected</span>;
    default:
      return <span className={styles["status-tag-pending"]}>Pending</span>;
  }
};

const TasksPageContent = () => {
  const [openCourses, setOpenCourses] = useState<Record<string, boolean>>({});
  const [openAssignments, setOpenAssignments] = useState<
    Record<string, boolean>
  >({});
  const { lecturerId, isLoading: isLecturerLoading } = useLecturer();
  const [selectedSemester, setSelectedSemester] = useState<string>("all");

  // Fetch tasks using TanStack Query
  const { data: tasksResponse, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.assignRequests.byLecturerId(Number(lecturerId!)),
    queryFn: () => assignRequestService.getAssignRequests({
      lecturerId: Number(lecturerId!),
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: !!lecturerId && !isLecturerLoading,
  });

  const allTasks = tasksResponse?.items || [];
  const error = queryError ? "Failed to load tasks." : null;

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
      // Group by both courseName and semesterName to handle same course in different semesters
      // Use a separator that's unlikely to appear in course names
      const courseKey = `${task.courseName || "Uncategorized"}|||${task.semesterName || "Unknown"}`;
      if (!acc[courseKey]) {
        acc[courseKey] = [];
      }
      acc[courseKey].push(task);
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
        Object.keys(groupedByCourse).map((courseKey) => {
          // Extract courseName and semesterName from the key
          // Use the first task in the group to get semesterName (all tasks in same group have same semester)
          const tasks = groupedByCourse[courseKey];
          const firstTask = tasks[0];
          const courseName = firstTask.courseName || "Uncategorized";
          const semesterName = firstTask.semesterName;
          const displayTitle = semesterName && semesterName !== "Unknown" 
            ? `${courseName} (${semesterName})`
            : courseName;
          
          return (
          <div className={styles["task-section"]} key={courseKey}>
            <div
              className={styles["task-header"]}
              onClick={() => toggleCourse(courseKey)}
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
                <span className={styles["task-title-text"]}>
                  {displayTitle}
                </span>
              </div>
              <div className={styles["task-meta"]}>
                <span>{groupedByCourse[courseKey].length} Tasks</span>
                <svg
                  className={`${styles["question-dropdown-arrow"]} ${
                    openCourses[courseKey] ? styles.rotate : ""
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
            {openCourses[courseKey] && (
              <div
                className={`${styles["task-content"]} ${styles["nested-content"]}`}
              >
                {groupedByCourse[courseKey].map((task) => (
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
                        <span className={styles["task-title-text"]}>
                          {task.courseElementName}
                        </span>
                        {getStatusTag(task.status)}
                      </div>
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
          );
        })
      )}
    </div>
  );
};

export default function TasksPage() {
  return (
    <App>
      <TasksPageContent />
    </App>
  );
}
