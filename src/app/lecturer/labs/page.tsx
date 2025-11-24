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
import { gradingService } from "@/services/gradingService";
import { RobotOutlined } from "@ant-design/icons";
import { App } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useRouter } from "next/navigation";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Panel } = Collapse;
const { Text, Paragraph, Title } = Typography;

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

const LabDetailItem = ({
  lab,
  template,
  classAssessment,
  submissions,
  onDeadlineSave,
}: {
  lab: CourseElement;
  template?: AssessmentTemplate;
  classAssessment?: ClassAssessment;
  submissions: Submission[];
  onDeadlineSave?: (courseElementId: number, newDate: dayjs.Dayjs | null) => void;
}) => {
  const router = useRouter();
  const { message } = App.useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assessmentFiles, setAssessmentFiles] = useState<AssessmentFile[]>([]);
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  const [batchGradingLoading, setBatchGradingLoading] = useState(false);

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

  const handleSubmissionClick = (submission: Submission) => {
    // Save submissionId to localStorage for the grading page
    localStorage.setItem("selectedSubmissionId", submission.id.toString());
    router.push("/lecturer/assignment-grading");
  };

  const handleBatchGrading = async () => {
    if (submissions.length === 0) {
      message.warning("No submissions to grade");
      return;
    }

    // Get assessmentTemplateId
    const assessmentTemplateId = template?.id || classAssessment?.assessmentTemplateId;
    if (!assessmentTemplateId) {
      message.error("Cannot find assessment template. Please contact administrator.");
      return;
    }

    try {
      setBatchGradingLoading(true);
      message.loading(`Starting batch grading for ${submissions.length} submission(s)...`, 0);

      // Call auto grading for each submission
      const gradingPromises = submissions.map(async (submission) => {
        try {
          await gradingService.autoGrading({
            submissionId: submission.id,
            assessmentTemplateId: assessmentTemplateId,
          });
          return { success: true, submissionId: submission.id };
        } catch (err: any) {
          console.error(`Failed to grade submission ${submission.id}:`, err);
          return { success: false, submissionId: submission.id, error: err.message };
        }
      });

      const results = await Promise.all(gradingPromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      message.destroy();
      setBatchGradingLoading(false);

      if (successCount > 0) {
        message.success(`Batch grading started for ${successCount}/${submissions.length} submission(s)`);
      }
      if (failCount > 0) {
        message.warning(`Failed to start grading for ${failCount} submission(s)`);
      }
    } catch (err: any) {
      console.error("Failed to start batch grading:", err);
      message.destroy();
      setBatchGradingLoading(false);
      message.error(err.message || "Failed to start batch grading");
    }
  };

  return (
    <>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card bordered={false}>
          <Descriptions column={1} layout="vertical" title="Lab Details">
            <Descriptions.Item label="Description">
              <Paragraph>{lab.description}</Paragraph>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {onDeadlineSave && (
          <Card bordered={false}>
            <Descriptions column={1} layout="vertical">
              <Descriptions.Item label="Deadline">
                <DeadlinePopover
                  id={lab.id.toString()}
                  date={classAssessment?.endAt}
                  onSave={(id, newDate) => onDeadlineSave(lab.id, newDate)}
                />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <Card 
          title="Submissions"
          extra={
            submissions.length > 0 && (
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleBatchGrading}
                loading={batchGradingLoading}
              >
                Batch Grade
              </Button>
            )
          }
        >
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
                          Submitted: {dayjs(submission.submittedAt).format("DD MMM YYYY, HH:mm")}
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

const LabsPage = () => {
  const [labs, setLabs] = useState<CourseElement[]>([]);
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

      const allLabs = allElements.filter(
        (el) => 
          el.semesterCourseId.toString() === classData.semesterCourseId &&
          isLab(el) // Only include labs
      );

      // Map class assessments by course element
      const assessmentMap = new Map<number, ClassAssessment>();
      for (const assessment of classAssessmentRes.items) {
        if (assessment.courseElementId) {
          assessmentMap.set(assessment.courseElementId, assessment);
        }
      }

      // Don't filter labs - show all course elements
      // Only approved assessment templates will be used when rendering
      const filteredLabs = allLabs;

      // Fetch submissions for class assessments
      const classAssessmentIds = Array.from(assessmentMap.values()).map(ca => ca.id);
      const submissionsByCourseElement = new Map<number, Submission[]>();
      
      if (classAssessmentIds.length > 0) {
        try {
          // Fetch submissions for each class assessment
          const submissionPromises = classAssessmentIds.map(classAssessmentId =>
            submissionService.getSubmissionList({ classAssessmentId: classAssessmentId }).catch(() => [])
          );
          const submissionArrays = await Promise.all(submissionPromises);
          const allSubmissions = submissionArrays.flat();
          
          // Map submissions by course element via class assessment
          for (const submission of allSubmissions) {
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

      setLabs(filteredLabs);
      setTemplates(approvedTemplates);
      setClassAssessments(assessmentMap);
      setSubmissions(submissionsByCourseElement);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.message || "Failed to load labs.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { message } = App.useApp();

  const handleDeadlineSave = async (courseElementId: number, newDate: dayjs.Dayjs | null) => {
    if (!newDate || !selectedClassId) return;

    const classAssessment = classAssessments.get(courseElementId);
    const lab = labs.find(l => l.id === courseElementId);
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
        Labs
      </Title>
      {labs.length === 0 ? (
        <Alert message="No labs found" description="There are no labs for this class." type="info" />
      ) : (
        <Collapse
          accordion
          bordered={false}
          className={styles.collapse}
          defaultActiveKey={labs.length > 0 ? [labs[0].id.toString()] : []}
        >
          {labs.map((lab) => {
            const classAssessment = classAssessments.get(lab.id);
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
                (t) => t.courseElementId === lab.id
              );
            }
            
            // Only show classAssessment if it has an approved template
            const approvedClassAssessment = matchingTemplate && classAssessment?.assessmentTemplateId === matchingTemplate.id 
              ? classAssessment 
              : undefined;
            
            const labSubmissions = approvedClassAssessment ? (submissions.get(lab.id) || []) : [];
            
            return (
              <Panel
                key={lab.id}
                header={
                  <div className={styles.panelHeader}>
                    <div>
                      <Text
                        type="secondary"
                        style={{ fontSize: "0.9rem", color: "#E86A92" }}
                      >
                        <LinkOutlined /> {matchingTemplate ? "Active Lab" : "No Approved Template"}
                      </Text>
                      <Title level={4} style={{ margin: "4px 0 0 0" }}>
                        {lab.name}
                      </Title>
                    </div>
                  </div>
                }
              >
                <LabDetailItem 
                  lab={lab} 
                  template={matchingTemplate}
                  classAssessment={approvedClassAssessment}
                  submissions={labSubmissions}
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

export default LabsPage;

