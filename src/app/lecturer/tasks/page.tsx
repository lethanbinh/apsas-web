"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./Tasks.module.css";
import { useLecturer } from "@/hooks/useLecturer";
import {
  assignRequestService,
  AssignRequestItem,
} from "@/services/assignRequestService";
import { semesterService, Semester } from "@/services/semesterService";
import { Spin, Select, App, Space } from "antd";
import { LecturerTaskContent } from "@/components/lecturer/LecturerTaskContent";
import { queryKeys } from "@/lib/react-query";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";

const getStatusTag = (status: number) => {
  switch (status) {
    case 1:
    case 2:
    case 4:
      return <span className={styles["status-tag-pending"]}>Pending</span>;
    case 5:
      return <span className={styles["status-tag-completed"]}>Approved</span>;
    case 3:
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
  const [currentSemesterCode, setCurrentSemesterCode] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<number | undefined>(undefined);
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string | undefined>(undefined);
  const [templatesWithRequestIds, setTemplatesWithRequestIds] = useState<Set<number>>(new Set());

  const { data: allSemesters = [] } = useQuery({
    queryKey: queryKeys.semesters.list(),
    queryFn: async () => {
      const semesters = await semesterService.getSemesters({
        pageNumber: 1,
        pageSize: 1000,
      });

      const now = new Date();
      const activeSemester = semesters.find((sem) => {
        const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
        const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
        return now >= startDate && now <= endDate;
      });
      if (activeSemester) {
        setCurrentSemesterCode(activeSemester.semesterCode);
      } else {
        setCurrentSemesterCode(null);
      }

      return semesters;
    },
  });

  const { data: tasksResponse, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.assignRequests.byLecturerId(Number(lecturerId!)),
    queryFn: () => assignRequestService.getAssignRequests({
      lecturerId: Number(lecturerId!),
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: !!lecturerId && !isLecturerLoading,
  });

  const { data: templatesResponse } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 10000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 10000,
    }),
    enabled: !!lecturerId && !isLecturerLoading,
  });

  useEffect(() => {
    if (templatesResponse?.items) {
      const templateRequestIds = new Set(
        templatesResponse.items
          .filter(t => t.assignRequestId)
          .map(t => t.assignRequestId!)
      );
      setTemplatesWithRequestIds(templateRequestIds);
    }
  }, [templatesResponse]);

  const allTasks = tasksResponse?.items || [];
  const error = queryError ? "Failed to load tasks." : null;
  const isLoadingData = isLoading && !tasksResponse;

  const semesterOptions = useMemo(() => {
    const uniqueSemesters = [
      ...new Set(allTasks.map((task) => task.semesterName).filter(Boolean)),
    ];

    const semesterMap = new Map<string, Semester>();
    uniqueSemesters.forEach((name) => {
      const exactMatch = allSemesters.find((sem) => sem.semesterCode === name);
      if (exactMatch) {
        semesterMap.set(name, exactMatch);
      } else {
        const partialMatch = allSemesters.find((sem) =>
          name.includes(sem.semesterCode) ||
          sem.semesterCode.includes(name) ||
          name.toLowerCase().includes(sem.semesterCode.toLowerCase()) ||
          sem.semesterCode.toLowerCase().includes(name.toLowerCase())
        );
        if (partialMatch) {
          semesterMap.set(name, partialMatch);
        }
      }
    });

    const sortedSemesters = uniqueSemesters.sort((a, b) => {
      const semA = semesterMap.get(a);
      const semB = semesterMap.get(b);
      if (semA && semB) {
        const dateA = new Date(semA.startDate.endsWith("Z") ? semA.startDate : semA.startDate + "Z");
        const dateB = new Date(semB.startDate.endsWith("Z") ? semB.startDate : semB.startDate + "Z");
        return dateB.getTime() - dateA.getTime();
      }
      if (semA) return -1;
      if (semB) return 1;
      return 0;
    });

    const options = sortedSemesters.map((semester) => ({
      label: semester,
      value: semester,
    }));
    return [{ label: "All Semesters", value: "all" }, ...options];
  }, [allTasks, allSemesters]);

  useEffect(() => {
    if (isInitialLoad && allSemesters.length > 0 && allTasks.length > 0) {
      let activeSemesterCode = currentSemesterCode;
      if (!activeSemesterCode) {
        const now = new Date();
        const activeSemester = allSemesters.find((sem) => {
          const startDate = new Date(sem.startDate.endsWith("Z") ? sem.startDate : sem.startDate + "Z");
          const endDate = new Date(sem.endDate.endsWith("Z") ? sem.endDate : sem.endDate + "Z");
          return now >= startDate && now <= endDate;
        });
        if (activeSemester) {
          activeSemesterCode = activeSemester.semesterCode;
        }
      }

      if (activeSemesterCode) {
        const uniqueSemesterNames = [
          ...new Set(allTasks.map((task) => task.semesterName).filter(Boolean)),
        ];

        const exactMatch = uniqueSemesterNames.find(
          (name) => name === activeSemesterCode
        );
        if (exactMatch) {
          setSelectedSemester(exactMatch);
          setIsInitialLoad(false);
          return;
        }

        const partialMatch = uniqueSemesterNames.find(
          (name) => name?.includes(activeSemesterCode!) ||
            name?.toLowerCase().includes(activeSemesterCode!.toLowerCase())
        );
        if (partialMatch) {
          setSelectedSemester(partialMatch);
          setIsInitialLoad(false);
          return;
        }
      }

      const uniqueSemesterNames = [
        ...new Set(allTasks.map((task) => task.semesterName).filter(Boolean)),
      ];

      if (uniqueSemesterNames.length > 0) {
        const semesterMap = new Map<string, Semester>();
        uniqueSemesterNames.forEach((name) => {
          const exactMatch = allSemesters.find((sem) => sem.semesterCode === name);
          if (exactMatch) {
            semesterMap.set(name, exactMatch);
          } else {
            const partialMatch = allSemesters.find((sem) =>
              name.includes(sem.semesterCode) ||
              sem.semesterCode.includes(name) ||
              name.toLowerCase().includes(sem.semesterCode.toLowerCase()) ||
              sem.semesterCode.toLowerCase().includes(name.toLowerCase())
            );
            if (partialMatch) {
              semesterMap.set(name, partialMatch);
            }
          }
        });

        const sortedSemesters = uniqueSemesterNames.sort((a, b) => {
          const semA = semesterMap.get(a);
          const semB = semesterMap.get(b);
          if (semA && semB) {
            const dateA = new Date(semA.startDate);
            const dateB = new Date(semB.startDate);
            return dateB.getTime() - dateA.getTime();
          }
          return 0;
        });

        if (sortedSemesters.length > 0) {
          setSelectedSemester(sortedSemesters[0]);
        }
      }

      setIsInitialLoad(false);
    }
  }, [currentSemesterCode, allTasks, allSemesters, isInitialLoad]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchesSemester = selectedSemester === "all" || task.semesterName === selectedSemester;

      let matchesStatus = true;
      if (selectedStatus !== undefined) {
        if (selectedStatus === 1) {
          matchesStatus = task.status === 1 || task.status === 2 || task.status === 4;
        } else if (selectedStatus === 3) {
          matchesStatus = task.status === 3;
        } else if (selectedStatus === 5) {
          matchesStatus = task.status === 5;
        } else {
          matchesStatus = task.status === selectedStatus;
        }
      }

      const matchesTemplate = !selectedTemplateFilter ||
        (selectedTemplateFilter === "with" && templatesWithRequestIds.has(task.id)) ||
        (selectedTemplateFilter === "without" && !templatesWithRequestIds.has(task.id));

      return matchesSemester && matchesStatus && matchesTemplate;
    });
  }, [allTasks, selectedSemester, selectedStatus, selectedTemplateFilter, templatesWithRequestIds]);

  const groupedByCourse = useMemo(() => {
    return filteredTasks.reduce((acc, task) => {
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

  if ((isLoading && !tasksResponse) || isLecturerLoading) {
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

      <Space size="middle" style={{ display: "flex", flexWrap: "wrap", marginBottom: "20px" }}>
        <Select
          value={selectedSemester}
          onChange={(value) => setSelectedSemester(value)}
          options={semesterOptions}
          style={{ width: 240 }}
          placeholder="Filter by Semester"
        />
        <Select
          placeholder="Filter by Status"
          allowClear
          style={{ minWidth: 150 }}
          value={selectedStatus}
          onChange={(value) => setSelectedStatus(value)}
          options={[
            { label: "Pending", value: 1 },
            { label: "Approved", value: 5 },
            { label: "Rejected", value: 3 },
          ]}
        />
        <Select
          placeholder="Filter by Template"
          allowClear
          style={{ minWidth: 150 }}
          value={selectedTemplateFilter}
          onChange={(value) => setSelectedTemplateFilter(value)}
          options={[
            { label: "With Template", value: "with" },
            { label: "Without Template", value: "without" },
          ]}
        />
      </Space>

      {filteredTasks.length === 0 ? (
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          No tasks found for the selected semester.
        </p>
      ) : (
        Object.keys(groupedByCourse).map((courseKey) => {
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
                    className={`${styles["question-dropdown-arrow"]} ${openCourses[courseKey] ? styles.rotate : ""
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
                          className={`${styles["question-dropdown-arrow"]} ${openAssignments[task.id.toString()]
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

