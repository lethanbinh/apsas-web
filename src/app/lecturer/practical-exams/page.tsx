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
import dayjs from "dayjs";
import { useRouter } from "next/navigation";

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

const ExamDetailItem = ({
  exam,
  template,
  classAssessment,
  submissions,
}: {
  exam: CourseElement;
  template?: AssessmentTemplate;
  classAssessment?: ClassAssessment;
  submissions: Submission[];
}) => {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assessmentFiles, setAssessmentFiles] = useState<AssessmentFile[]>([]);
  const [isFilesLoading, setIsFilesLoading] = useState(false);

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

  return (
    <>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card bordered={false}>
          <Descriptions column={1} layout="vertical" title="Exam Details">
            <Descriptions.Item label="Description">
              <Paragraph>{exam.description}</Paragraph>
            </Descriptions.Item>
          </Descriptions>
        </Card>

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

const PracticalExamsPage = () => {
  const [exams, setExams] = useState<CourseElement[]>([]);
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

      const allExams = allElements.filter(
        (el) => 
          el.semesterCourseId.toString() === classData.semesterCourseId &&
          isPracticalExam(el) // Only include practical exams
      );

      // Map class assessments by course element
      const assessmentMap = new Map<number, ClassAssessment>();
      for (const assessment of classAssessmentRes.items) {
        if (assessment.courseElementId) {
          assessmentMap.set(assessment.courseElementId, assessment);
        }
      }

      // Don't filter exams - show all course elements
      // Only approved assessment templates will be used when rendering
      const filteredExams = allExams;

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

      setExams(filteredExams);
      setTemplates(approvedTemplates);
      setClassAssessments(assessmentMap);
      setSubmissions(submissionsByCourseElement);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.message || "Failed to load practical exams.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          defaultActiveKey={exams.length > 0 ? [exams[0].id.toString()] : []}
        >
          {exams.map((exam) => {
            const classAssessment = classAssessments.get(exam.id);
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
                (t) => t.courseElementId === exam.id
              );
            }
            
            // Only show classAssessment if it has an approved template
            const approvedClassAssessment = matchingTemplate && classAssessment?.assessmentTemplateId === matchingTemplate.id 
              ? classAssessment 
              : undefined;
            
            const examSubmissions = approvedClassAssessment ? (submissions.get(exam.id) || []) : [];
            
            return (
              <Panel
                key={exam.id}
                header={
                  <div className={styles.panelHeader}>
                    <div>
                      <Text
                        type="secondary"
                        style={{ fontSize: "0.9rem", color: "#E86A92" }}
                      >
                        <LinkOutlined /> {matchingTemplate ? "Active Exam" : "No Approved Template"}
                      </Text>
                      <Title level={4} style={{ margin: "4px 0 0 0" }}>
                        {exam.name}
                      </Title>
                    </div>
                  </div>
                }
              >
                <ExamDetailItem 
                  exam={exam} 
                  template={matchingTemplate}
                  classAssessment={approvedClassAssessment}
                  submissions={examSubmissions}
                />
              </Panel>
            );
          })}
        </Collapse>
      )}
    </div>
  );
};

export default PracticalExamsPage;

