"use client";

import DatePickerModal from "@/components/features/DatePickerModal";
import PaperAssignmentModal from "@/components/features/PaperAssignmentModal";
import { Collapse, Spin } from "antd";
import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import styles from "./DetailAsm.module.css";
import {
  CourseElement,
  courseElementService,
} from "@/services/courseElementService";
import { classService } from "@/services/classService";
import {
  assessmentTemplateService,
  AssessmentTemplate,
} from "@/services/assessmentTemplateService";
import {
  assessmentFileService,
  AssessmentFile,
} from "@/services/assessmentFileService";
import {
  classAssessmentService,
  ClassAssessment,
} from "@/services/classAssessmentService";

const { Panel } = Collapse;

const convertToDate = (dateString?: string): Date | null => {
  if (!dateString) return null;
  if (dateString.endsWith("Z")) {
    return new Date(dateString);
  }
  return new Date(dateString + "Z");
};

const AssignmentDetailItem = ({
  assignment,
  template,
  classAssessment,
  selectedClassId,
  onDeadlineUpdate,
}: {
  assignment: CourseElement;
  template?: AssessmentTemplate;
  classAssessment?: ClassAssessment;
  selectedClassId: string;
  onDeadlineUpdate: () => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(
    convertToDate(classAssessment?.startAt)
  );
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(
    convertToDate(classAssessment?.endAt)
  );

  const [assessmentFiles, setAssessmentFiles] = useState<AssessmentFile[]>([]);
  const [isFilesLoading, setIsFilesLoading] = useState(false);

  useEffect(() => {
    if (template?.id) {
      const fetchFiles = async () => {
        setIsFilesLoading(true);
        try {
          const files = await assessmentFileService.getFilesForTemplate(
            template.id
          );
          setAssessmentFiles(files);
        } catch (error) {
          console.error("Failed to fetch assessment files:", error);
          setAssessmentFiles([]);
        } finally {
          setIsFilesLoading(false);
        }
      };
      fetchFiles();
    }
  }, [template]);

  useEffect(() => {
    setSelectedStartDate(convertToDate(classAssessment?.startAt));
    setSelectedEndDate(convertToDate(classAssessment?.endAt));
  }, [classAssessment]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const openStartDatePicker = () => setIsStartDatePickerOpen(true);
  const closeStartDatePicker = () => setIsStartDatePickerOpen(false);
  const openEndDatePicker = () => setIsEndDatePickerOpen(true);
  const closeEndDatePicker = () => setIsEndDatePickerOpen(false);

  const handleSetDeadline = async (
    newStart: Date | null,
    newEnd: Date | null
  ) => {
    const now = new Date();
    const fiveSecondsFromNow = new Date(now.getTime() + 5000);

    let startAt: string;
    let endAt: string;

    if (classAssessment) {
      startAt = newStart ? newStart.toISOString() : classAssessment.startAt;
      endAt = newEnd ? newEnd.toISOString() : classAssessment.endAt;
    } else {
      startAt = newStart
        ? newStart.toISOString()
        : fiveSecondsFromNow.toISOString();
      if (newEnd) {
        endAt = newEnd.toISOString();
      } else {
        const defaultEndDate = new Date(
          new Date(startAt).getTime() + 24 * 3600 * 1000
        );
        endAt = defaultEndDate.toISOString();
      }
    }

    const localStartDate = new Date(startAt);
    if (localStartDate < now && !classAssessment) {
      alert("Start date cannot be in the past.");
      return;
    }

    if (new Date(endAt) <= new Date(startAt)) {
      alert("End date must be after the start date.");
      return;
    }

    try {
      if (!template) {
        alert("No assessment template found to create a deadline.");
        return;
      }

      const payload = {
        classId: Number(selectedClassId),
        assessmentTemplateId: template.id,
        startAt,
        endAt,
      };

      if (classAssessment) {
        await classAssessmentService.updateClassAssessment(
          classAssessment.id,
          payload
        );
      } else {
        await classAssessmentService.createClassAssessment(payload);
      }
      onDeadlineUpdate();
    } catch (error: any) {
      console.error("Failed to set deadline:", error);
      alert(`Error: ${error.message || "Failed to update deadline."}`);
    }
  };

  const handleStartDateSelect = (date: Date) => {
    setSelectedStartDate(date);
    handleSetDeadline(date, selectedEndDate);
    closeStartDatePicker();
  };

  const handleEndDateSelect = (date: Date) => {
    setSelectedEndDate(date);
    handleSetDeadline(selectedStartDate, date);
    closeEndDatePicker();
  };

  return (
    <>
      <div className={styles["content-card"]}>
        <h2
          className={styles["assignment-title"]}
          onClick={openModal}
          style={{ cursor: "pointer", fontSize: "1.2rem", margin: 0 }}
        >
          {assignment.name}
        </h2>

        <div className={styles["date-info-container"]}>
          <div
            className={styles["date-info"]}
            onClick={openStartDatePicker}
            style={{ cursor: "pointer" }}
          >
            <svg
              className={styles["date-icon"]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a 2 2 0 002 2z"
              ></path>
            </svg>
            {selectedStartDate
              ? `Start: ${format(selectedStartDate, "dd/MM/yy HH:mm")}`
              : "Set Start"}
          </div>
          <div
            className={styles["date-info"]}
            onClick={openEndDatePicker}
            style={{ cursor: "pointer" }}
          >
            <svg
              className={styles["date-icon"]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a 2 2 0 002 2z"
              ></path>
            </svg>
            {selectedEndDate
              ? `End: ${format(selectedEndDate, "dd/MM/yy HH:mm")}`
              : "Set End"}
          </div>
        </div>

        <div className={styles["requirement-link-container"]}>
          {isFilesLoading ? (
            <Spin size="small" />
          ) : (
            <div className={styles["requirement-file-list"]}>
              {assessmentFiles.length > 0 ? (
                assessmentFiles.map((file) => (
                  <a
                    key={file.id}
                    href={file.fileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles["requirement-link"]}
                  >
                    <svg
                      className={styles["link-icon"]}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      ></path>
                    </svg>
                    {file.name}
                  </a>
                ))
              ) : (
                <span className={styles["requirement-link"]}>
                  No requirement files.
                </span>
              )}
            </div>
          )}
        </div>

        <div className={styles["description-text-background"]}>
          <p className={styles["description-text"]}>{assignment.description}</p>
        </div>

        <div className={styles["submissions-section"]}>
          <h2 className={styles["submissions-title"]}>Submissions</h2>
          <div className={styles["submission-item"]}>
            <div className={styles["submission-info"]}>
              <div className={styles["file-icon-wrapper"]}>
                <svg
                  className={styles["file-icon"]}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  ></path>
                </svg>
              </div>
              <div className={styles["submission-details"]}>
                <span className={styles["student-name"]}>
                  <Link
                    href="/lecturer/assignment-grading"
                    className={styles["student-name-link"]}
                  >
                    Lethanhbinh
                  </Link>
                </span>
                <span className={styles["file-name"]}>lethanhbinh-asm.zip</span>
              </div>
            </div>
            <svg
              className={styles["download-icon"]}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              ></path>
            </svg>
          </div>
        </div>
      </div>
      <PaperAssignmentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        template={template}
      />
      <DatePickerModal
        isOpen={isStartDatePickerOpen}
        onClose={closeStartDatePicker}
        onDateSelect={handleStartDateSelect}
        selectedDate={selectedStartDate}
        minDate={new Date()}
        maxDate={selectedEndDate || undefined}
        showTimeSelect
      />
      <DatePickerModal
        isOpen={isEndDatePickerOpen}
        onClose={closeEndDatePicker}
        onDateSelect={handleEndDateSelect}
        selectedDate={selectedEndDate}
        minDate={selectedStartDate || new Date()}
        showTimeSelect
      />
    </>
  );
};

const DetailAssignmentPage = () => {
  const [assignments, setAssignments] = useState<CourseElement[]>([]);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [classAssessments, setClassAssessments] = useState<ClassAssessment[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    const classId = localStorage.getItem("selectedClassId");
    setSelectedClassId(classId);
    if (!classId) {
      setError("No class selected. Please select a class first.");
      setIsLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedClassId) return;

    try {
      setIsLoading(true);
      const classData = await classService.getClassById(selectedClassId);
      if (!classData) {
        throw new Error("Class not found");
      }

      const [allElements, templateResponse, classAssessmentResponse] =
        await Promise.all([
          courseElementService.getCourseElements({
            pageNumber: 1,
            pageSize: 1000,
          }),
          assessmentTemplateService.getAssessmentTemplates({
            pageNumber: 1,
            pageSize: 1000,
          }),
          classAssessmentService.getClassAssessments({
            classId: Number(selectedClassId),
            pageNumber: 1,
            pageSize: 1000,
          }),
        ]);

      const filteredAssignments = allElements.filter(
        (el) => el.semesterCourseId.toString() === classData.semesterCourseId
      );

      setAssignments(filteredAssignments);
      setTemplates(templateResponse.items);
      setClassAssessments(classAssessmentResponse.items);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.message || "Failed to load assignments.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <div className={styles.container}>
        <div className={styles["header-section"]}>
          <h1 className={styles.title}>Assignments</h1>
          <Link href="/lecturer/dashboard" className={styles["dashboard-link"]}>
            Dashboard
          </Link>
        </div>

        {isLoading && (
          <div className={styles["loading-spinner"]}>
            <Spin size="large" />
          </div>
        )}

        {!isLoading && error && (
          <div className={styles["error-message"]}>{error}</div>
        )}

        {!isLoading && !error && selectedClassId && (
          <Collapse accordion>
            {assignments.length > 0 ? (
              assignments.map((assignment) => {
                const matchingTemplate = templates.find(
                  (t) => t.courseElementId === assignment.id
                );
                const matchingClassAssessment = matchingTemplate
                  ? classAssessments.find(
                      (ca) => ca.assessmentTemplateId === matchingTemplate.id
                    )
                  : undefined;
                return (
                  <Panel header={assignment.name} key={assignment.id}>
                    <AssignmentDetailItem
                      assignment={assignment}
                      template={matchingTemplate}
                      classAssessment={matchingClassAssessment}
                      selectedClassId={selectedClassId}
                      onDeadlineUpdate={fetchData}
                    />
                  </Panel>
                );
              })
            ) : (
              <div className={styles["no-assignments-message"]}>
                No assignments found for this class.
              </div>
            )}
          </Collapse>
        )}
      </div>
    </div>
  );
};

export default DetailAssignmentPage;
