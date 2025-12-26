"use client";
import { RequirementModal } from "@/components/student/RequirementModal";
import { RequirementContent } from "@/components/student/data";
import styles from "@/components/student/AssignmentList.module.css";
import { DeadlinePopover } from "@/components/student/DeadlinePopover";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/react-query";
import {
  assessmentFileService
} from "@/services/assessmentFileService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import {
  AssessmentTemplate,
  assessmentTemplateService,
} from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";
import { ClassAssessment, classAssessmentService } from "@/services/classAssessmentService";
import { classService } from "@/services/classService";
import {
  CourseElement,
  courseElementService,
} from "@/services/courseElementService";
import { gradeItemService } from "@/services/gradeItemService";
import { gradingService } from "@/services/gradingService";
import { rubricItemService } from "@/services/rubricItemService";
import { Submission, submissionService } from "@/services/submissionService";
import { exportGradeReportToExcel, GradeReportData } from "@/utils/exportGradeReport";
import { DownloadOutlined, FileExcelOutlined, FolderOutlined, LinkOutlined, PaperClipOutlined, RobotOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { handleDownloadAll, AssignmentWithData } from "./utils/downloadAll";
import { useMutation, useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  Descriptions,
  List,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
dayjs.extend(utc);
dayjs.extend(timezone);
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};
const { Panel } = Collapse;
const { Text, Paragraph, Title } = Typography;
function isPracticalExam(element: CourseElement): boolean {
  return element.elementType === 2;
}
function isLab(element: CourseElement): boolean {
  return element.elementType === 1;
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
  semesterStartDate,
  semesterEndDate,
}: {
  assignment: CourseElement;
  template?: AssessmentTemplate;
  classAssessment?: ClassAssessment;
  submissions: Submission[];
  onDeadlineSave?: (courseElementId: number, startDate: dayjs.Dayjs | null, endDate: dayjs.Dayjs | null) => void;
  semesterStartDate?: string;
  semesterEndDate?: string;
}) => {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batchGradingLoading, setBatchGradingLoading] = useState(false);
  const [publishGradeLoading, setPublishGradeLoading] = useState(false);
  const handleSubmissionClick = (submission: Submission) => {
    localStorage.setItem("selectedSubmissionId", submission.id.toString());
    router.push("/lecturer/assignment-grading");
  };
  const handleBatchGrading = async () => {
    if (submissions.length === 0) {
      message.warning("No submissions to grade");
      return;
    }
    if (semesterEndDate) {
      const semesterEnd = dayjs.utc(semesterEndDate).tz("Asia/Ho_Chi_Minh");
      const now = dayjs().tz("Asia/Ho_Chi_Minh");
      if (now.isAfter(semesterEnd, 'day')) {
        message.warning("Cannot use batch grading when the semester has ended.");
        return;
      }
    }
    const assessmentTemplateId = template?.id || classAssessment?.assessmentTemplateId;
    if (!assessmentTemplateId) {
      message.error("Cannot find assessment template. Please contact administrator.");
      return;
    }
      setBatchGradingLoading(true);
      message.loading(`Starting batch grading for ${submissions.length} submission(s)...`, 0);
      const gradingPromises = submissions.map(async (submission) => {
        try {
        await batchGradingMutation.mutateAsync({
            submissionId: submission.id,
            assessmentTemplateId: assessmentTemplateId,
          });
          return { success: true, submissionId: submission.id };
        } catch (err: any) {
          console.error(`Failed to grade submission ${submission.id}:`, err);
          return { success: false, submissionId: submission.id, error: err.message };
        }
      });
    try {
      const results = await Promise.all(gradingPromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      const successfulSubmissionIds = results.filter(r => r.success).map(r => r.submissionId);
      if (successCount > 0) {
        message.destroy();
        message.loading(`Batch grading in progress for ${successCount} submission(s)...`, 0);
        const pollInterval = setInterval(async () => {
          try {
            const sessionPromises = successfulSubmissionIds.map(submissionId =>
              gradingService.getGradingSessions({
                submissionId: submissionId,
                pageNumber: 1,
                pageSize: 100,
              }).catch(() => ({ items: [] }))
            );
            const sessionResults = await Promise.all(sessionPromises);
            let allCompleted = true;
            for (const result of sessionResults) {
              if (result.items.length > 0) {
                const latestSession = result.items.sort((a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0];
                if (latestSession.status === 0) {
                  allCompleted = false;
                  break;
                }
              } else {
                allCompleted = false;
                break;
              }
            }
            if (allCompleted) {
              clearInterval(pollInterval);
              message.destroy();
              setBatchGradingLoading(false);
              // Invalidate and refetch to update grades immediately
              // Invalidate all related queries
              await queryClient.invalidateQueries({ queryKey: ['submissions', 'byClassAssessments'] });
              await queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
              await queryClient.invalidateQueries({ queryKey: ['gradeItems'] });
              // Refetch to update the UI immediately
              await queryClient.refetchQueries({ 
                predicate: (query) => {
                  const key = query.queryKey;
                  return (
                    (Array.isArray(key) && key[0] === 'submissions' && key[1] === 'byClassAssessments') ||
                    (Array.isArray(key) && key[0] === 'gradingSessions') ||
                    (Array.isArray(key) && key[0] === 'gradeItems')
                  );
                }
              });
              message.success(`Batch grading completed for ${successCount} submission(s)`);
            }
          } catch (err: any) {
            console.error("Failed to poll grading status:", err);
          }
        }, 5000);
        (window as any).batchGradingPollInterval = pollInterval;
      } else {
        message.destroy();
        setBatchGradingLoading(false);
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
  const { data: filesResponse, isLoading: isFilesLoading } = useQuery({
    queryKey: queryKeys.assessmentFiles.byTemplateId(template?.id!),
    queryFn: () => assessmentFileService.getFilesForTemplate({
      assessmentTemplateId: template!.id,
            pageNumber: 1,
            pageSize: 100,
    }),
    enabled: !!template?.id,
  });
  const assessmentFiles = filesResponse?.items || [];
  const gradingSessionsQueries = useQueries({
    queries: submissions.map((sub) => ({
      queryKey: queryKeys.grading.sessions.list({ submissionId: sub.id, pageNumber: 1, pageSize: 1 }),
      queryFn: () => gradingService.getGradingSessions({
        submissionId: sub.id,
        pageNumber: 1,
        pageSize: 1,
      }),
      enabled: submissions.length > 0,
    })),
  });
  const gradeItemsQueries = useQueries({
    queries: gradingSessionsQueries.map((sessionQuery: any, index: number) => ({
      queryKey: ['gradeItems', 'byGradingSessionId', sessionQuery.data?.items?.[0]?.id],
      queryFn: () => {
        const latestSession = sessionQuery.data?.items?.[0];
        if (!latestSession?.id) return { items: [] };
        return gradeItemService.getGradeItems({
          gradingSessionId: latestSession.id,
          pageNumber: 1,
          pageSize: 1000,
        });
      },
      enabled: submissions.length > 0 && !!sessionQuery.data?.items?.[0]?.id,
    })),
  });
  const { data: papersResponse } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(template?.id!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: template!.id,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: !!template?.id,
  });
  const questionsQueries = useQueries({
    queries: (papersResponse?.items || []).map((paper) => ({
      queryKey: queryKeys.assessmentQuestions.byPaperId(paper.id),
      queryFn: () => assessmentQuestionService.getAssessmentQuestions({
        assessmentPaperId: paper.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: (papersResponse?.items || []).length > 0,
    })),
  });
  const allQuestions = useMemo(() => {
    const questions: any[] = [];
    questionsQueries.forEach((query: any) => {
      if (query.data?.items) {
        questions.push(...query.data.items);
      }
    });
    return questions.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
  }, [questionsQueries]);
  const rubricsQueries = useQueries({
    queries: allQuestions.map((question) => ({
      queryKey: queryKeys.rubricItems.byQuestionId(question.id),
      queryFn: () => rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: question.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: allQuestions.length > 0,
    })),
  });
  const maxScore = useMemo(() => {
    let total = 0;
    rubricsQueries.forEach((query: any) => {
      if (query.data?.items) {
        query.data.items.forEach((rubric: any) => {
          total += rubric.score || 0;
        });
      }
    });
    return total;
  }, [rubricsQueries]);
  const submissionScores = useMemo(() => {
    const scoreMap: Record<number, { total: number; max: number }> = {};
    submissions.forEach((submission, index) => {
      const sessionsQuery = gradingSessionsQueries[index];
      const gradeItemsQuery = gradeItemsQueries[index];
      if (sessionsQuery?.data?.items && sessionsQuery.data.items.length > 0) {
        const latestSession = sessionsQuery.data.items[0];
        if (gradeItemsQuery?.data?.items && gradeItemsQuery.data.items.length > 0) {
          const totalScore = gradeItemsQuery.data.items.reduce((sum: number, item: any) => sum + item.score, 0);
          scoreMap[submission.id] = { total: totalScore, max: maxScore };
        } else if (latestSession.grade !== undefined && latestSession.grade !== null) {
          scoreMap[submission.id] = { total: latestSession.grade, max: maxScore };
        }
      }
    });
    return scoreMap;
  }, [submissions, gradingSessionsQueries, gradeItemsQueries, maxScore]);
  const batchGradingMutation = useMutation({
    mutationFn: async ({ submissionId, assessmentTemplateId }: { submissionId: number; assessmentTemplateId: number }) => {
      return gradingService.autoGrading({
        submissionId,
        assessmentTemplateId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byClassAssessments'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
    },
  });
  const publishGradeMutation = useMutation({
    mutationFn: async (classAssessmentId: number) => {
      return classAssessmentService.updateClassAssessment(classAssessmentId, {
        isPublished: true,
      });
    },
    onSuccess: () => {
      message.success("Grades have been published successfully!");
      queryClient.invalidateQueries({ queryKey: queryKeys.classAssessments.byClassId(classAssessment?.classId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.classAssessments.all });
    },
    onError: (err: any) => {
      message.error(err.message || "Failed to publish grades");
    },
  });
  const handlePublishGrade = () => {
    if (!classAssessment) return;
    modal.confirm({
      title: "Publish Grades",
      content: "Once you confirm, the grades cannot be changed anymore. Are you sure you want to publish the grades?",
      okText: "Confirm",
      cancelText: "Cancel",
      onOk: async () => {
        setPublishGradeLoading(true);
        try {
          await publishGradeMutation.mutateAsync(classAssessment.id);
        } finally {
          setPublishGradeLoading(false);
        }
      },
    });
  };
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const deadline = classAssessment?.endAt;
  return (
    <>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card bordered={false}>
          <Descriptions column={1} layout="vertical" title="Assignment Details">
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
          <Button
            type="primary"
            onClick={openModal}
            style={{ marginTop: 16 }}
            className={styles.viewRequirementButton}
          >
            View Requirement Details
          </Button>
        </Card>
        {onDeadlineSave && (
          <Card bordered={false}>
            <Descriptions column={1} layout="vertical">
              <Descriptions.Item label="Deadline">
                <DeadlinePopover
                  id={assignment.id.toString()}
                  startDate={classAssessment?.startAt}
                  endDate={classAssessment?.endAt}
                  semesterStartDate={semesterStartDate}
                  semesterEndDate={semesterEndDate}
                  onSave={(id, startDate, endDate) => onDeadlineSave(assignment.id, startDate, endDate)}
                />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
        <Card
          title="Submissions"
          extra={
            <Space>
              {classAssessment && (
                <Button
                  type="default"
                  icon={<CheckCircleOutlined />}
                  onClick={handlePublishGrade}
                  loading={publishGradeLoading}
                  disabled={classAssessment.isPublished || (semesterEndDate ? dayjs().tz("Asia/Ho_Chi_Minh").isAfter(dayjs.utc(semesterEndDate).tz("Asia/Ho_Chi_Minh"), 'day') : false)}
                >
                  {classAssessment.isPublished ? "Grades Published" : "Publish Grade"}
                </Button>
              )}
              {submissions.length > 0 && (
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={handleBatchGrading}
                  loading={batchGradingLoading}
                  disabled={
                    classAssessment?.isPublished ||
                    (semesterEndDate ? dayjs().tz("Asia/Ho_Chi_Minh").isAfter(dayjs.utc(semesterEndDate).tz("Asia/Ho_Chi_Minh"), 'day') : false)
                  }
                >
                  Grade All
                </Button>
              )}
            </Space>
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
                    title={
                      <Space>
                        <Text strong>{submission.studentName}</Text>
                        {submissionScores[submission.id] && (
                          <Tag color="green">
                            {submissionScores[submission.id].max > 0
                              ? `${submissionScores[submission.id].total.toFixed(2)}/${submissionScores[submission.id].max.toFixed(2)}`
                              : submissionScores[submission.id].total.toFixed(2)}
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <div>{submission.submissionFile?.name || "No file"}</div>
                        <Text type="secondary" style={{ fontSize: "0.85rem" }}>
                          Submitted: {toVietnamTime(submission.updatedAt || submission.submittedAt).format("DD MMM YYYY, HH:mm")}
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
      <RequirementModal
        open={isModalOpen}
        onCancel={closeModal}
        title={assignment.name}
        content={assignment.description ? [{ type: "paragraph", content: assignment.description }] as RequirementContent[] : []}
        classAssessmentId={classAssessment?.id}
        classId={Number(localStorage.getItem("selectedClassId"))}
        assessmentTemplateId={template?.id}
        courseElementId={assignment.id}
      />
    </>
  );
};
const DetailAssignmentPage = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  useEffect(() => {
    const classId = localStorage.getItem("selectedClassId");
    setSelectedClassId(classId);
  }, []);
  const { data: classData, isLoading: isLoadingClass } = useQuery({
    queryKey: queryKeys.classes.detail(selectedClassId!),
    queryFn: () => classService.getClassById(selectedClassId!),
    enabled: !!selectedClassId,
  });
  const { data: allElements = [] } = useQuery({
    queryKey: queryKeys.courseElements.list({}),
    queryFn: () => courseElementService.getCourseElements({
          pageNumber: 1,
          pageSize: 1000,
        }),
  });
  const { data: assignRequestResponse } = useQuery({
    queryKey: queryKeys.assignRequests.lists(),
    queryFn: () => assignRequestService.getAssignRequests({
          pageNumber: 1,
          pageSize: 1000,
        }),
  });
  const { data: templateResponse } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({}),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
          pageNumber: 1,
          pageSize: 1000,
        }),
  });
  const { data: classAssessmentRes } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(selectedClassId!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: Number(selectedClassId!),
          pageNumber: 1,
          pageSize: 1000,
    }),
    enabled: !!selectedClassId,
  });
  const { assignments, templates, classAssessments, semesterInfo } = useMemo(() => {
    if (!classData || !allElements.length) {
      return { assignments: [], templates: [], classAssessments: new Map(), semesterInfo: null };
    }
    const approvedAssignRequests = (assignRequestResponse?.items || []).filter(ar => ar.status === 5);
      const approvedAssignRequestIds = new Set(approvedAssignRequests.map(ar => ar.id));
    const approvedTemplates = (templateResponse?.items || []).filter(t =>
        t.assignRequestId && approvedAssignRequestIds.has(t.assignRequestId)
      );
      const approvedTemplateMap = new Map<number, AssessmentTemplate>();
      approvedTemplates.forEach(t => {
        if (t.courseElementId) {
          approvedTemplateMap.set(t.courseElementId, t);
        }
      });
      const allAssignments = allElements.filter(
        (el) =>
          el.semesterCourseId.toString() === classData.semesterCourseId &&
          el.elementType === 0
      );
      const assessmentMap = new Map<number, ClassAssessment>();
    for (const assessment of (classAssessmentRes?.items || [])) {
        if (assessment.courseElementId) {
          assessmentMap.set(assessment.courseElementId, assessment);
        }
      }
    let semesterStartDate: string | undefined;
    let semesterEndDate: string | undefined;
    const classElement = allElements.find(
      el => el.semesterCourseId.toString() === classData.semesterCourseId
    );
    if (classElement?.semesterCourse?.semester) {
      semesterStartDate = classElement.semesterCourse.semester.startDate;
      semesterEndDate = classElement.semesterCourse.semester.endDate;
    }
    return {
      assignments: allAssignments,
      templates: approvedTemplates,
      classAssessments: assessmentMap,
      semesterInfo: semesterStartDate && semesterEndDate ? { startDate: semesterStartDate, endDate: semesterEndDate } : null,
    };
  }, [classData, allElements, assignRequestResponse, templateResponse, classAssessmentRes]);
  const classAssessmentIds = useMemo(() => {
    return Array.from(classAssessments.values())
      .map(ca => ca.id)
      .filter(id => id !== undefined && id !== null)
      .sort((a, b) => a - b);
  }, [classAssessments]);
  
  // Create a lookup map for classAssessmentId -> courseElementId
  const classAssessmentToCourseElementMap = useMemo(() => {
    const map = new Map<number, number>();
    classAssessments.forEach((ca, courseElementId) => {
      if (ca.id) {
        map.set(ca.id, courseElementId);
      }
    });
    return map;
  }, [classAssessments]);
  
  const { data: submissionsData } = useQuery({
    queryKey: ['submissions', 'byClassAssessments', classAssessmentIds],
    queryFn: async () => {
      if (classAssessmentIds.length === 0) return new Map<number, Submission[]>();
      
      // Guard: Check if submissionService is available
      if (!submissionService) {
        console.error('submissionService is not available');
        return new Map<number, Submission[]>();
      }
      
      if (typeof submissionService.getSubmissionList !== 'function') {
        console.error('submissionService.getSubmissionList is not a function', submissionService);
        return new Map<number, Submission[]>();
      }
      
      const submissionPromises = classAssessmentIds.map(async (classAssessmentId) => {
        try {
          if (!classAssessmentId || classAssessmentId <= 0) {
            return [];
          }
          const result = await submissionService.getSubmissionList({ 
            classAssessmentId: classAssessmentId 
          });
          return Array.isArray(result) ? result : [];
        } catch (error) {
          console.error(`Failed to fetch submissions for classAssessmentId ${classAssessmentId}:`, error);
          return [];
        }
      });
      
      const submissionArrays = await Promise.all(submissionPromises);
      const allSubmissions = submissionArrays.flat().filter(sub => sub && sub.id);
      const submissionsByCourseElement = new Map<number, Submission[]>();
      
      for (const submission of allSubmissions) {
        if (!submission || !submission.classAssessmentId) continue;
        const courseElementId = classAssessmentToCourseElementMap.get(submission.classAssessmentId);
          if (courseElementId !== undefined) {
            const existing = submissionsByCourseElement.get(courseElementId) || [];
            existing.push(submission);
            submissionsByCourseElement.set(courseElementId, existing);
          }
        }
        for (const [courseElementId, subs] of submissionsByCourseElement.entries()) {
          const sortedSubs = [...subs].sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.submittedAt || 0).getTime();
            const dateB = new Date(b.updatedAt || b.submittedAt || 0).getTime();
            if (dateB !== dateA) {
              return dateB - dateA;
            }
            return (b.id || 0) - (a.id || 0);
          });
          const studentSubmissions = new Map<number, Submission>();
          for (const sub of sortedSubs) {
            if (!sub.studentId) continue;
            const existing = studentSubmissions.get(sub.studentId);
            if (!existing) {
              studentSubmissions.set(sub.studentId, sub);
            } else {
              const existingDate = new Date(existing.updatedAt || existing.submittedAt || 0).getTime();
              const currentDate = new Date(sub.updatedAt || sub.submittedAt || 0).getTime();
              if (currentDate > existingDate ||
                  (currentDate === existingDate && (sub.id || 0) > (existing.id || 0))) {
                studentSubmissions.set(sub.studentId, sub);
              }
            }
          }
          const latestSubs = Array.from(studentSubmissions.values()).sort(
            (a, b) => {
              const dateA = new Date(a.updatedAt || a.submittedAt || 0).getTime();
              const dateB = new Date(b.updatedAt || b.submittedAt || 0).getTime();
              if (dateB !== dateA) {
                return dateB - dateA;
              }
              return (b.id || 0) - (a.id || 0);
            }
          );
          submissionsByCourseElement.set(courseElementId, latestSubs);
      }
      return submissionsByCourseElement;
    },
    enabled: classAssessmentIds.length > 0 && classAssessmentToCourseElementMap.size > 0,
  });
  const submissions = useMemo(() => {
    if (!submissionsData) {
      return new Map<number, Submission[]>();
    }
    // Ensure submissionsData is a Map
    if (submissionsData instanceof Map) {
      return submissionsData;
    }
    // If it's not a Map, convert it or return empty Map
    console.warn('submissionsData is not a Map, converting or using empty Map');
    return new Map<number, Submission[]>();
  }, [submissionsData]);
  const isLoading = isLoadingClass && !classData;
  const error = !selectedClassId ? "No class selected. Please select a class first." : null;
  const updateDeadlineMutation = useMutation({
    mutationFn: async ({ classAssessmentId, payload }: { classAssessmentId: number; payload: any }) => {
      return classAssessmentService.updateClassAssessment(classAssessmentId, payload);
    },
    onSuccess: () => {
      if (selectedClassId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.classAssessments.byClassId(selectedClassId) });
      }
      message.success("Deadline updated successfully!");
    },
    onError: (err: any) => {
      console.error("Failed to update deadline:", err);
      message.error(err.message || "Failed to update deadline");
    },
  });
  const createDeadlineMutation = useMutation({
    mutationFn: async (payload: any) => {
      return classAssessmentService.createClassAssessment(payload);
    },
    onSuccess: () => {
      if (selectedClassId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.classAssessments.byClassId(selectedClassId) });
      }
      message.success("Deadline created successfully!");
    },
    onError: (err: any) => {
      console.error("Failed to create deadline:", err);
      message.error(err.message || "Failed to create deadline");
    },
  });
  const handleExportReport = async () => {
    if (!selectedClassId || !user?.id) {
      message.error("Class ID or User ID not found");
      return;
    }
    try {
      message.info("Preparing report...");
      const classData = await classService.getClassById(selectedClassId);
      if (!classData) {
        message.error("Class not found");
        return;
      }
      const courseElementsRes = await courseElementService.getCourseElements({
        pageNumber: 1,
        pageSize: 1000,
      });
      const classAssessmentRes = await classAssessmentService.getClassAssessments({
        classId: Number(selectedClassId),
        pageNumber: 1,
        pageSize: 1000,
      });
      const assignmentElements = courseElementsRes.filter(ce => {
        const classAssessment = classAssessmentRes.items.find(ca => ca.courseElementId === ce.id);
        return classAssessment && classAssessment.classId === Number(selectedClassId) &&
          ce.elementType === 0;
      });
      const reportData: GradeReportData[] = [];
      for (const courseElement of assignmentElements) {
        const classAssessment = classAssessmentRes.items.find(ca => ca.courseElementId === courseElement.id);
        if (!classAssessment) continue;
        const allStudents = await classService.getStudentsInClass(Number(selectedClassId)).catch(() => []);
        let submissions: Submission[] = [];
        try {
          if (submissionService && typeof submissionService.getSubmissionList === 'function' && classAssessment.id) {
            submissions = await submissionService.getSubmissionList({
          classAssessmentId: classAssessment.id,
            });
          } else {
            console.error('submissionService.getSubmissionList is not available');
          }
        } catch (error) {
          console.error(`Failed to fetch submissions for classAssessment ${classAssessment.id}:`, error);
        }
        const submissionMap = new Map<number, Submission>();
        for (const submission of submissions) {
          if (submission.studentId) {
            submissionMap.set(submission.studentId, submission);
          }
        }
        let questions: any[] = [];
        const rubrics: { [questionId: number]: any[] } = {};
        try {
          const assessmentTemplateId = classAssessment.assessmentTemplateId;
          if (assessmentTemplateId !== null) {
            const papersRes = await assessmentPaperService.getAssessmentPapers({
              assessmentTemplateId: assessmentTemplateId,
              pageNumber: 1,
              pageSize: 100,
            });
            for (const paper of papersRes.items) {
              const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
                assessmentPaperId: paper.id,
                pageNumber: 1,
                pageSize: 100,
              });
              questions = [...questions, ...questionsRes.items];
              for (const question of questionsRes.items) {
                const rubricsRes = await rubricItemService.getRubricsForQuestion({
                  assessmentQuestionId: question.id,
                  pageNumber: 1,
                  pageSize: 100,
                });
                rubrics[question.id] = rubricsRes.items;
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch questions/rubrics for assignment ${courseElement.id}:`, err);
        }
        for (const student of allStudents) {
          const submission = submissionMap.get(student.studentId) || null;
          let gradingSession = null;
          let gradeItems: any[] = [];
          if (submission) {
            try {
              const gradingSessionsResult = await gradingService.getGradingSessions({
                submissionId: submission.id,
              });
              if (gradingSessionsResult.items.length > 0) {
                gradingSession = gradingSessionsResult.items.sort((a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0];
                const gradeItemsResult = await gradeItemService.getGradeItems({
                  gradingSessionId: gradingSession.id,
                });
                gradeItems = gradeItemsResult.items;
        }
      } catch (err) {
              console.error(`Failed to fetch grading data for submission ${submission.id}:`, err);
            }
          }
          const submissionData: Submission = submission || {
            id: 0,
            studentId: student.studentId,
            studentCode: student.studentCode || "",
            studentName: student.studentName || "",
            classAssessmentId: classAssessment.id,
            submittedAt: "",
            lastGrade: 0,
            status: 0,
            createdAt: "",
            updatedAt: "",
            submissionFile: null,
          };
          reportData.push({
            submission: submissionData,
            gradingSession,
            gradeItems,
            questions,
            rubrics,
            feedback: {
              overallFeedback: "",
              strengths: "",
              weaknesses: "",
              codeQuality: "",
              algorithmEfficiency: "",
              suggestionsForImprovement: "",
              bestPractices: "",
              errorHandling: "",
            },
            courseElementName: courseElement.name,
            assignmentType: "Assignment",
          });
        }
      }
      if (reportData.length === 0) {
        message.warning("No data available to export");
        return;
      }
      await exportGradeReportToExcel(reportData, "Assignment_Grade_Report");
      message.success("Assignment grade report exported successfully");
    } catch (err: any) {
      console.error("Export error:", err);
      message.error(err.message || "Export failed. Please check browser console for details.");
    }
  };
  const handleDeadlineSave = async (
    courseElementId: number,
    startDate: dayjs.Dayjs | null,
    endDate: dayjs.Dayjs | null
  ) => {
    if (!startDate || !endDate || !selectedClassId) return;
    if (startDate.isAfter(endDate) || startDate.isSame(endDate)) {
      message.error("Start date must be before end date");
      return;
    }
    const classAssessment = classAssessments.get(courseElementId);
    const assignment = assignments.find(a => a.id === courseElementId);
    const matchingTemplate = templates.find(t => t.courseElementId === courseElementId);
    if (classAssessment) {
      updateDeadlineMutation.mutate({
        classAssessmentId: classAssessment.id,
        payload: {
        classId: Number(selectedClassId),
        assessmentTemplateId: classAssessment.assessmentTemplateId,
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          isPublished: classAssessment.isPublished ?? false,
        },
      });
    } else {
      if (!matchingTemplate) {
        message.error("Assessment template not found. Cannot create deadline.");
        return;
      }
      createDeadlineMutation.mutate({
          classId: Number(selectedClassId),
          assessmentTemplateId: matchingTemplate.id,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        isPublished: false,
      });
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
      <Title
        level={2}
        style={{
          fontWeight: 700,
          color: "#2F327D",
            margin: 0,
        }}
      >
        Assignments
      </Title>
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              const assignmentsWithData: AssignmentWithData[] = assignments.map((assignment) => {
                const classAssessment = classAssessments.get(assignment.id);
                let matchingTemplate: AssessmentTemplate | undefined;
                if (classAssessment?.assessmentTemplateId) {
                  matchingTemplate = templates.find(
                    (t) => t.id === classAssessment.assessmentTemplateId
                  );
                } else {
                  matchingTemplate = templates.find(
                    (t) => t.courseElementId === assignment.id
                  );
                }
                const approvedClassAssessment = matchingTemplate && classAssessment?.assessmentTemplateId === matchingTemplate.id
                  ? classAssessment
                  : undefined;
                const assignmentSubmissions = approvedClassAssessment && submissions instanceof Map 
                  ? (submissions.get(assignment.id) || []) 
                  : [];
                return {
                  assignment,
                  template: matchingTemplate,
                  submissions: assignmentSubmissions,
                };
              }).filter(item => item.submissions.length > 0);
              handleDownloadAll(assignmentsWithData, message);
            }}
            size="large"
          >
            Download All
          </Button>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={handleExportReport}
            size="large"
          >
            Export Grade Report
          </Button>
        </Space>
      </div>
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
            let matchingTemplate: AssessmentTemplate | undefined;
            if (classAssessment?.assessmentTemplateId) {
              matchingTemplate = templates.find(
                (t) => t.id === classAssessment.assessmentTemplateId
              );
            } else {
              matchingTemplate = templates.find(
                (t) => t.courseElementId === assignment.id
              );
            }
            const approvedClassAssessment = matchingTemplate && classAssessment?.assessmentTemplateId === matchingTemplate.id
              ? classAssessment
              : undefined;
            const assignmentSubmissions = approvedClassAssessment && submissions instanceof Map
              ? (submissions.get(assignment.id) || [])
              : [];
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
                  semesterStartDate={semesterInfo?.startDate}
                  semesterEndDate={semesterInfo?.endDate}
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