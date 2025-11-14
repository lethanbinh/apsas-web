"use client";

import PaperAssignmentModal from "@/components/features/PaperAssignmentModal";
import {
  Collapse,
  Spin,
  Card,
  Button,
  List,
  Typography,
  Descriptions,
  Space,
  Alert,
  App,
} from "antd";
import { LinkOutlined } from "@ant-design/icons";
import { useEffect, useState, useCallback } from "react";
import styles from "@/components/student/AssignmentList.module.css";
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
  PaperClipOutlined,
  DownloadOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import { classAssessmentService, ClassAssessment } from "@/services/classAssessmentService";
import { submissionService, Submission } from "@/services/submissionService";
import { assignRequestService } from "@/services/assignRequestService";
import { DeadlinePopover } from "@/components/student/DeadlinePopover";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useRouter } from "next/navigation";

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

const { Panel } = Collapse;
const { Text, Paragraph, Title } = Typography;

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
  submissions,
  onDeadlineSave,
}: {
  assignment: CourseElement;
  template?: AssessmentTemplate;
  classAssessment?: ClassAssessment;
  submissions: Submission[];
  onDeadlineSave?: (courseElementId: number, newDate: dayjs.Dayjs | null) => void;
}) => {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assessmentFiles, setAssessmentFiles] = useState<AssessmentFile[]>([]);
  const [isFilesLoading, setIsFilesLoading] = useState(false);

  const handleSubmissionClick = (submission: Submission) => {
    localStorage.setItem("selectedSubmissionId", submission.id.toString());
    router.push("/lecturer/assignment-grading");
  };

  useEffect(() => {
    if (template?.id) {
      const fetchFiles = async () => {
        setIsFilesLoading(true);
        try {
          const response = await assessmentFileService.getFilesForTemplate({
            assessmentTemplateId: template.id,
            pageNumber: 1,
            pageSize: 100,
          });
          setAssessmentFiles(response.items);
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

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const deadline = classAssessment?.endAt;

  return (
    <>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card bordered={false}>
          <Descriptions column={1} layout="vertical" title="Assignment Details">
            <Descriptions.Item label="Description">
              <Paragraph>{assignment.description}</Paragraph>
            </Descriptions.Item>

            <Descriptions.Item label="Requirement Files">
              {isFilesLoading ? (
                <Spin />
              ) : (
                <>
                  {assessmentFiles.length > 0 ? (
                    <List
                      dataSource={assessmentFiles}
                      renderItem={(file) => (
                        <List.Item>
                          <a
                            key={file.id}
                            href={file.fileUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <PaperClipOutlined style={{ marginRight: 8 }} />
                            {file.name}
                          </a>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Text type="secondary">No requirement files.</Text>
                  )}
                </>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Button type="primary" onClick={openModal} style={{ marginTop: 16 }}>
            View Assignment Paper
          </Button>
        </Card>

        {onDeadlineSave && (
          <Card bordered={false}>
            <Descriptions column={1} layout="vertical">
              <Descriptions.Item label="Deadline">
                <DeadlinePopover
                  id={assignment.id.toString()}
                  date={deadline}
                  onSave={(id, newDate) => onDeadlineSave(assignment.id, newDate)}
                />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Card title="Submissions">
          {submissions.length === 0 ? (
            <Text type="secondary">No submissions yet.</Text>
          ) : (
            <List
              dataSource={submissions}
              renderItem={(submission) => (
                <List.Item
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSubmissionClick(submission)}
                  actions={[
                    submission.submissionFile && (
                      <Button
                        type="text"
                        icon={<DownloadOutlined />}
                        key="download"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (submission.submissionFile?.submissionUrl) {
                            window.open(submission.submissionFile.submissionUrl, "_blank");
                          }
                        }}
                      />
                    ),
                  ]}
                >
                  <List.Item.Meta
                    avatar={<FolderOutlined />}
                    title={submission.studentName}
                    description={
                      <div>
                        <div>{submission.submissionFile?.name || "No file"}</div>
                        <Text type="secondary" style={{ fontSize: "0.85rem" }}>
                          Submitted: {toVietnamTime(submission.submittedAt).format("DD MMM YYYY, HH:mm")}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Space>

      <PaperAssignmentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        template={template}
        classAssessmentId={classAssessment?.id}
        classId={Number(localStorage.getItem("selectedClassId"))}
      />
    </>
  );
};

const DetailAssignmentPage = () => {
  const { message } = App.useApp();
  const [assignments, setAssignments] = useState<CourseElement[]>([]);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [classAssessments, setClassAssessments] = useState<Map<number, ClassAssessment>>(new Map());
  const [submissions, setSubmissions] = useState<Map<number, Submission[]>>(new Map());
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

      const [allElements, assignRequestResponse, templateResponse, classAssessmentRes] = await Promise.all([
        courseElementService.getCourseElements({
          pageNumber: 1,
          pageSize: 1000,
        }),
        assignRequestService.getAssignRequests({
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
        }).catch(() => ({ items: [] })),
      ]);

      // Filter approved assign requests (status = 5)
      const approvedAssignRequests = assignRequestResponse.items.filter(ar => ar.status === 5);
      const approvedAssignRequestIds = new Set(approvedAssignRequests.map(ar => ar.id));

      // Filter assessment templates by approved assign request IDs
      const approvedTemplates = templateResponse.items.filter(t => 
        t.assignRequestId && approvedAssignRequestIds.has(t.assignRequestId)
      );
      const approvedTemplateIds = new Set(approvedTemplates.map(t => t.id));
      const approvedTemplateMap = new Map<number, AssessmentTemplate>();
      approvedTemplates.forEach(t => {
        if (t.courseElementId) {
          approvedTemplateMap.set(t.courseElementId, t);
        }
      });

      const allAssignments = allElements.filter(
        (el) => 
          el.semesterCourseId.toString() === classData.semesterCourseId &&
          !isPracticalExam(el) // Exclude practical exams
      );

      // Map class assessments by course element
      const assessmentMap = new Map<number, ClassAssessment>();
      for (const assessment of classAssessmentRes.items) {
        if (assessment.courseElementId) {
          assessmentMap.set(assessment.courseElementId, assessment);
        }
      }

      // Don't filter assignments - show all course elements
      // Only approved assessment templates will be used when rendering
      const filteredAssignments = allAssignments;

      // Fetch submissions for class assessments
      const classAssessmentIds = Array.from(assessmentMap.values()).map(ca => ca.id);
      const submissionsByCourseElement = new Map<number, Submission[]>();
      
      if (classAssessmentIds.length > 0) {
        try {
          // Fetch submissions via classAssessmentIds (for assignments)
          const classAssessmentSubmissionPromises = classAssessmentIds.map(classAssessmentId =>
            submissionService.getSubmissionList({ classAssessmentId: classAssessmentId }).catch(() => [])
          );
          
          const classAssessmentSubmissions = await Promise.all(classAssessmentSubmissionPromises);
          const allClassAssessmentSubs = classAssessmentSubmissions.flat();
          
          // Map submissions by course element via class assessment
          for (const submission of allClassAssessmentSubs) {
            const classAssessment = Array.from(assessmentMap.values()).find(ca => ca.id === submission.classAssessmentId);
            if (classAssessment && classAssessment.courseElementId) {
              const existing = submissionsByCourseElement.get(classAssessment.courseElementId) || [];
              existing.push(submission);
              submissionsByCourseElement.set(classAssessment.courseElementId, existing);
            }
          }
          
          // Sort submissions by submittedAt (most recent first) and get latest per student
          for (const [courseElementId, subs] of submissionsByCourseElement.entries()) {
            // Group by studentId and get latest submission for each student
            const studentSubmissions = new Map<number, Submission>();
            for (const sub of subs) {
              const existing = studentSubmissions.get(sub.studentId);
              if (!existing || new Date(sub.submittedAt) > new Date(existing.submittedAt)) {
                studentSubmissions.set(sub.studentId, sub);
              }
            }
            // Convert back to array and sort by submittedAt
            const latestSubs = Array.from(studentSubmissions.values()).sort(
              (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
            );
            submissionsByCourseElement.set(courseElementId, latestSubs);
          }
        } catch (err) {
          console.error("Failed to fetch submissions:", err);
          // Continue without submissions
        }
      }

      setAssignments(filteredAssignments);
      setTemplates(approvedTemplates);
      setClassAssessments(assessmentMap);
      setSubmissions(submissionsByCourseElement);
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

  const handleDeadlineSave = async (courseElementId: number, newDate: dayjs.Dayjs | null) => {
    if (!newDate || !selectedClassId) return;

    const classAssessment = classAssessments.get(courseElementId);
    const assignment = assignments.find(a => a.id === courseElementId);
    const matchingTemplate = templates.find(t => t.courseElementId === courseElementId);

    // If classAssessment exists, update it
    if (classAssessment) {
    try {
      await classAssessmentService.updateClassAssessment(classAssessment.id, {
        classId: Number(selectedClassId),
        assessmentTemplateId: classAssessment.assessmentTemplateId,
          startAt: classAssessment.startAt || dayjs().toISOString(),
        endAt: newDate.toISOString(),
      });

      // Update local state
      const updated = new Map(classAssessments);
      updated.set(courseElementId, {
        ...classAssessment,
        endAt: newDate.toISOString(),
          startAt: classAssessment.startAt || dayjs().toISOString(),
      });
      setClassAssessments(updated);
      message.success("Deadline updated successfully!");
    } catch (err: any) {
      console.error("Failed to update deadline:", err);
      message.error(err.message || "Failed to update deadline");
      }
    } else {
      // If classAssessment doesn't exist, create a new one
      if (!matchingTemplate) {
        message.error("Assessment template not found. Cannot create deadline.");
        return;
      }

      try {
        const newClassAssessment = await classAssessmentService.createClassAssessment({
          classId: Number(selectedClassId),
          assessmentTemplateId: matchingTemplate.id,
          startAt: dayjs().toISOString(),
          endAt: newDate.toISOString(),
        });

        // Update local state
        const updated = new Map(classAssessments);
        updated.set(courseElementId, newClassAssessment);
        setClassAssessments(updated);
        message.success("Deadline created successfully!");
        
        // Refresh data to get the new classAssessment
        await fetchData();
      } catch (err: any) {
        console.error("Failed to create deadline:", err);
        message.error(err.message || "Failed to create deadline");
      }
    }
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
          color: "#2F327D",
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
          defaultActiveKey={assignments.length > 0 ? [assignments[0].id.toString()] : []}
        >
          {assignments.map((assignment) => {
            const classAssessment = classAssessments.get(assignment.id);
            // Only show template if it's approved (templates state already contains only approved templates)
            let matchingTemplate: AssessmentTemplate | undefined;
            if (classAssessment?.assessmentTemplateId) {
              // Check if the classAssessment's template is in the approved templates list
              matchingTemplate = templates.find(
                (t) => t.id === classAssessment.assessmentTemplateId
              );
            } else {
              // Check if there's an approved template directly linked to this course element
              matchingTemplate = templates.find(
                (t) => t.courseElementId === assignment.id
              );
            }
            
            // Only show classAssessment if it has an approved template
            const approvedClassAssessment = matchingTemplate && classAssessment?.assessmentTemplateId === matchingTemplate.id 
              ? classAssessment 
              : undefined;
            
            const assignmentSubmissions = approvedClassAssessment ? (submissions.get(assignment.id) || []) : [];
            
            return (
              <Panel
                key={assignment.id}
                header={
                  <div className={styles.panelHeader}>
                    <div>
                      <Text
                        type="secondary"
                        style={{ fontSize: "0.9rem", color: "#E86A92" }}
                      >
                        <LinkOutlined /> {matchingTemplate ? "Active Assignment" : "No Approved Template"}
                      </Text>
                      <Title level={4} style={{ margin: "4px 0 0 0" }}>
                        {assignment.name}
                      </Title>
                    </div>
                  </div>
                }
              >
                <AssignmentDetailItem
                  assignment={assignment}
                  template={matchingTemplate}
                  classAssessment={approvedClassAssessment}
                  submissions={assignmentSubmissions}
                  onDeadlineSave={handleDeadlineSave}
                />
              </Panel>
            );
          })}
        </Collapse>
      )}
    </div>
  );
};

export default DetailAssignmentPage;