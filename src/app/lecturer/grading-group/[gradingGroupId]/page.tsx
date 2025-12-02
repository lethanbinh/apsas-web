"use client";

import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { FeedbackData, geminiService } from "@/services/geminiService";
import { gradingService, GradingSession } from "@/services/gradingService";
import { gradeItemService, GradeItem } from "@/services/gradeItemService";
import { courseElementService } from "@/services/courseElementService";
import { exportGradeReportToExcel, GradeReportData } from "@/utils/exportGradeReport";
import { semesterService, SemesterPlanDetail } from "@/services/semesterService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission, submissionService } from "@/services/submissionService";
import { gradingGroupService, GradingGroup } from "@/services/gradingGroupService";
import { submissionFeedbackService, SubmissionFeedback } from "@/services/submissionFeedbackService";
import { Alert } from "antd";
import {
  ArrowLeftOutlined,
  HistoryOutlined,
  RobotOutlined,
  SaveOutlined,
  LeftOutlined,
  RightOutlined,
  EditOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Select,
  Divider,
  Empty,
  Upload,
} from "antd";
import type { TableProps } from "antd";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import styles from "./page.module.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useAuth } from "@/hooks/useAuth";

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

// Helper function to check if semester has passed
const isSemesterPassed = (endDate: string | null | undefined): boolean => {
  if (!endDate) return false;
  const now = dayjs().tz("Asia/Ho_Chi_Minh");
  const semesterEnd = toVietnamTime(endDate);
  if (!semesterEnd || !semesterEnd.isValid()) return false;
  return now.isAfter(semesterEnd, 'day');
};

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
}

export default function GradingGroupPage() {
  const router = useRouter();
  const params = useParams();
  const gradingGroupId = params?.gradingGroupId ? Number(params.gradingGroupId) : null;
  const { message } = App.useApp();
  const { user } = useAuth();

  const [editSubmissionModalVisible, setEditSubmissionModalVisible] = useState(false);
  const [selectedSubmissionForEdit, setSelectedSubmissionForEdit] = useState<Submission | null>(null);
  const [batchGradingLoading, setBatchGradingLoading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);
  const [semesterEnded, setSemesterEnded] = useState(false);
  const queryClient = useQueryClient();

  const { data: gradingGroupsData, isLoading: isLoadingGradingGroups } = useQuery({
    queryKey: queryKeys.grading.groups.all,
    queryFn: () => gradingGroupService.getGradingGroups({}),
    enabled: !!gradingGroupId,
  });

  const gradingGroup = useMemo(() => {
    if (!gradingGroupsData || !gradingGroupId) return null;
    return gradingGroupsData.find(g => g.id === gradingGroupId) || null;
  }, [gradingGroupsData, gradingGroupId]);

  // Handle grading group not found - only redirect after query has finished loading
  useEffect(() => {
    if (!gradingGroup && gradingGroupId && !isLoadingGradingGroups) {
      message.error("Grading group not found");
      router.back();
    }
  }, [gradingGroup, gradingGroupId, isLoadingGradingGroups, message, router]);

  // Fetch all submissions in this grading group
  const { data: allSubmissionsData = [] } = useQuery({
    queryKey: ['submissions', 'byGradingGroupId', gradingGroupId],
    queryFn: () => submissionService.getSubmissionList({
      gradingGroupId: gradingGroupId!,
    }),
    enabled: !!gradingGroupId,
  });

  // Filter to get latest submission for each student
  const submissions = useMemo(() => {
    const studentSubmissions = new Map<number, Submission>();
    for (const sub of allSubmissionsData) {
      if (!sub.studentId) continue;
      const existing = studentSubmissions.get(sub.studentId);
      if (!existing) {
        studentSubmissions.set(sub.studentId, sub);
      } else {
        const existingDate = existing.submittedAt ? new Date(existing.submittedAt).getTime() : 0;
        const currentDate = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
        
        if (currentDate > existingDate) {
          studentSubmissions.set(sub.studentId, sub);
        } else if (currentDate === existingDate && sub.id > existing.id) {
          studentSubmissions.set(sub.studentId, sub);
        }
      }
    }
    
    return Array.from(studentSubmissions.values()).sort((a, b) => 
      (a.studentCode || "").localeCompare(b.studentCode || "")
    );
  }, [allSubmissionsData]);

  // Fetch latest grading sessions for all submissions to calculate total scores
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

  // Calculate total scores for each submission
  const submissionTotalScores = useMemo(() => {
    const scoreMap: Record<number, number> = {};
    submissions.forEach((submission, index) => {
      const sessionsQuery = gradingSessionsQueries[index];
      if (sessionsQuery?.data?.items && sessionsQuery.data.items.length > 0) {
        const latestSession = sessionsQuery.data.items[0];
        if (latestSession.grade !== undefined && latestSession.grade !== null) {
          scoreMap[submission.id] = latestSession.grade;
        }
      }
    });
    return scoreMap;
  }, [submissions, gradingSessionsQueries]);

  // Fetch assessment template to get course element and semester info
  const { data: templatesResponse } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!gradingGroup?.assessmentTemplateId,
  });

  const assessmentTemplate = useMemo(() => {
    if (!templatesResponse?.items || !gradingGroup?.assessmentTemplateId) return null;
    return templatesResponse.items.find((t) => t.id === gradingGroup.assessmentTemplateId) || null;
  }, [templatesResponse, gradingGroup?.assessmentTemplateId]);

  // Fetch course element to get semester info
  const { data: courseElementsData } = useQuery({
    queryKey: queryKeys.courseElements.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!assessmentTemplate?.courseElementId,
  });

  const courseElement = useMemo(() => {
    if (!courseElementsData || !assessmentTemplate?.courseElementId) return null;
    return courseElementsData.find((ce) => ce.id === assessmentTemplate.courseElementId) || null;
  }, [courseElementsData, assessmentTemplate]);

  // Fetch semester detail to check if passed
  const semesterCode = courseElement?.semesterCourse?.semester?.semesterCode;
  const { data: semesterDetail } = useQuery({
    queryKey: ['semesterPlanDetail', semesterCode],
    queryFn: () => semesterService.getSemesterPlanDetail(semesterCode!),
    enabled: !!semesterCode,
  });

  // Check if semester has passed
  useEffect(() => {
    if (semesterDetail?.endDate) {
      const passed = isSemesterPassed(semesterDetail.endDate);
      setSemesterEnded(passed);
    } else {
      setSemesterEnded(false);
    }
  }, [semesterDetail?.endDate]);

  // Mutation for uploading grade sheet
  const uploadGradeSheetMutation = useMutation({
    mutationFn: async ({ gradingGroupId, file }: { gradingGroupId: number; file: File }) => {
      return gradingGroupService.submitGradesToExaminer(gradingGroupId, file);
    },
    onSuccess: () => {
      message.success("Grade sheet uploaded successfully!");
      setUploadModalVisible(false);
      setUploadFile(null);
      setUploadFileList([]);
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
    onError: (err: any) => {
      console.error("Failed to upload grade sheet:", err);
      const errorMessage = err.message || err.response?.data?.errorMessages?.join(", ") || "Failed to upload grade sheet";
      message.error(errorMessage);
    },
  });

  const handleOpenEditModal = (submission: Submission) => {
    setSelectedSubmissionForEdit(submission);
    setEditSubmissionModalVisible(true);
  };

  const handleUploadGradeSheet = () => {
    if (!gradingGroup) return;
    setUploadFile(null);
    setUploadFileList([]);
    setUploadModalVisible(true);
  };

  const handleUploadSubmit = async () => {
    if (!gradingGroup || !uploadFile) {
      message.warning("Please select a file to upload");
      return;
    }

    uploadGradeSheetMutation.mutate({
      gradingGroupId: gradingGroup.id,
      file: uploadFile,
    });
  };

  const handleExportGradeReport = async () => {
    if (!gradingGroup) return;

    try {
      message.info("Preparing grade report...");

      // Get all submissions for this grading group
      const groupSubmissions = await submissionService.getSubmissionList({
        gradingGroupId: gradingGroup.id,
      });

      if (groupSubmissions.length === 0) {
        message.warning("No submissions found for this grading group");
        return;
      }

      // Get assessment template
      if (!gradingGroup.assessmentTemplateId) {
        message.error("Assessment template not found");
        return;
      }

      const templatesRes = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      const assessmentTemplate = templatesRes.items.find(
        (t) => t.id === gradingGroup.assessmentTemplateId
      );

      if (!assessmentTemplate) {
        message.error("Assessment template not found");
        return;
      }

      // Get course element
      if (!assessmentTemplate.courseElementId) {
        message.error("Course element not found");
        return;
      }

      const courseElements = await courseElementService.getCourseElements({
        pageNumber: 1,
        pageSize: 1000,
      });
      const courseElement = courseElements.find(
        (ce) => ce.id === assessmentTemplate.courseElementId
      );

      if (!courseElement) {
        message.error("Course element not found");
        return;
      }

      // Fetch questions and rubrics
      let questions: AssessmentQuestion[] = [];
      const rubrics: { [questionId: number]: RubricItem[] } = {};

      try {
        const papersRes = await assessmentPaperService.getAssessmentPapers({
          assessmentTemplateId: assessmentTemplate.id,
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
      } catch (err) {
        console.error("Failed to fetch questions/rubrics:", err);
      }

      // Prepare report data
      const reportData: GradeReportData[] = [];

      for (const submission of groupSubmissions) {
        let gradingSession = null;
        let gradeItems: any[] = [];

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

        // Determine assignment type from elementType field
        // elementType: 0 = Assignment, 1 = Lab, 2 = PE (Practical Exam)
        // Now only PE is used, so only elementType === 2 is "Practical Exam"
        const assignmentType: "Assignment" | "Lab" | "Practical Exam" = 
          courseElement.elementType === 2 ? "Practical Exam" :
          "Assignment";

        reportData.push({
          submission,
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
          assignmentType: assignmentType,
        });
      }

      if (reportData.length === 0) {
        message.warning("No data available to export");
        return;
      }

      await exportGradeReportToExcel(
        reportData,
        `Grade_Report_${gradingGroup.assessmentTemplateName || gradingGroup.id}`
      );
      message.success("Grade report exported successfully");
    } catch (err: any) {
      console.error("Export error:", err);
      message.error(err.message || "Export failed. Please check browser console for details.");
    }
  };

  const handleBatchGrading = async () => {
    if (!gradingGroup || !gradingGroup.assessmentTemplateId) {
      message.error("Cannot find assessment template. Please contact administrator.");
      return;
    }

    if (submissions.length === 0) {
      message.warning("No submissions to grade");
      return;
    }

    setBatchGradingLoading(true);
    message.loading(`Starting batch grading for ${submissions.length} submission(s)...`, 0);

    try {
      const gradingPromises = submissions.map(async (submission) => {
        try {
          await gradingService.autoGrading({
            submissionId: submission.id,
            assessmentTemplateId: gradingGroup.assessmentTemplateId!,
          });
          return { success: true, submissionId: submission.id };
        } catch (err: any) {
          console.error(`Failed to grade submission ${submission.id}:`, err);
          return { 
            success: false, 
            submissionId: submission.id, 
            error: err.message || "Unknown error" 
          };
        }
      });

      const results = await Promise.all(gradingPromises);
      message.destroy();
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        message.success(`Batch grading started for ${successCount}/${results.length} submission(s)`);
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
        queryClient.invalidateQueries({ queryKey: ['gradeItems'] });
        queryClient.invalidateQueries({ queryKey: ['submissions'] });
      }
      if (failCount > 0) {
        message.warning(`Failed to start grading for ${failCount} submission(s)`);
      }
    } catch (err: any) {
      message.destroy();
      console.error("Failed to start batch grading:", err);
      message.error(err.message || "Failed to start batch grading");
    } finally {
      setBatchGradingLoading(false);
    }
  };

  // Submission table columns
  const submissionColumns: TableProps<Submission>["columns"] = useMemo(() => [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      align: "center",
    },
    {
      title: "Student",
      key: "student",
      width: 200,
      render: (_: any, record: Submission) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{record.studentName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.studentCode}
          </Text>
        </div>
      ),
    },
    {
      title: "Submission File",
      key: "file",
      width: 200,
      render: (_: any, record: Submission) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined />
          <span>{record.submissionFile?.name || "N/A"}</span>
        </div>
      ),
    },
    {
      title: "Submitted At",
      dataIndex: "submittedAt",
      key: "submittedAt",
      width: 180,
      render: (date: string) => date
        ? dayjs.utc(date).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")
        : "N/A",
    },
    {
      title: "Score",
      key: "score",
      width: 120,
      align: "center",
      render: (_, record) => {
        const totalScore = submissionTotalScores[record.id];
        if (totalScore !== undefined && totalScore !== null) {
          return (
            <Tag color="green" style={{ fontSize: 14, fontWeight: 600 }}>
              {totalScore.toFixed(2)}
            </Tag>
          );
        }
        return (
          <Tag color="default">Not graded</Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right",
      align: "center",
      render: (_: any, record: Submission) => (
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => handleOpenEditModal(record)}
          size="small"
        >
          Edit
        </Button>
      ),
    },
  ], [submissionTotalScores]);

  const loading = isLoadingGradingGroups && !gradingGroup;

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (!gradingGroup) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="Grading group not found" type="error" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
                Back
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                {gradingGroup.assessmentTemplateName || "Grading Group"}
              </Title>
            </Space>
            <Space>
              <Button
                icon={<FileExcelOutlined />}
                onClick={handleExportGradeReport}
                disabled={semesterEnded || submissions.length === 0}
                size="large"
              >
                Export Grade Report
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={handleUploadGradeSheet}
                disabled={semesterEnded}
                size="large"
              >
                Submit Grade Sheet
              </Button>
              {submissions.length > 0 && (
                <Button
                  icon={<RobotOutlined />}
                  onClick={handleBatchGrading}
                  loading={batchGradingLoading}
                  type="primary"
                  size="large"
                  disabled={semesterEnded}
                >
                  Batch Grade
                </Button>
              )}
            </Space>
          </div>

          {/* Submissions Table */}
          <Card>
            {submissions.length === 0 ? (
              <Empty
                description="No submissions found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Table
                columns={submissionColumns}
                dataSource={submissions}
                rowKey="id"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} submissions`,
                }}
                scroll={{ x: 1000 }}
                onRow={(record) => ({
                  onClick: () => handleOpenEditModal(record),
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </Card>
        </Space>
      </Card>

      {/* Edit Submission Modal */}
      {selectedSubmissionForEdit && (
        <EditSubmissionModal
          visible={editSubmissionModalVisible}
          onClose={() => {
            setEditSubmissionModalVisible(false);
            setSelectedSubmissionForEdit(null);
          }}
          submission={selectedSubmissionForEdit}
          gradingGroup={gradingGroup}
        />
      )}

      {/* Upload Grade Sheet Modal */}
      <Modal
        title="Upload Grade Sheet"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setUploadFile(null);
          setUploadFileList([]);
        }}
        onOk={handleUploadSubmit}
        confirmLoading={uploadGradeSheetMutation.isPending}
        okText="Upload"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>Select Excel file to upload:</Text>
          <Upload
            fileList={uploadFileList}
            beforeUpload={(file) => {
              setUploadFile(file);
              setUploadFileList([{
                uid: file.name,
                name: file.name,
                status: 'done',
              }]);
              return false; // Prevent auto upload
            }}
            accept=".xlsx,.xls"
            maxCount={1}
            onRemove={() => {
              setUploadFile(null);
              setUploadFileList([]);
            }}
          >
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
          {uploadFile && (
            <Text type="secondary">Selected: {uploadFile.name}</Text>
          )}
        </Space>
      </Modal>
    </div>
  );
}

// Edit Submission Modal Component
function EditSubmissionModal({
  visible,
  onClose,
  submission,
  gradingGroup,
}: {
  visible: boolean;
  onClose: () => void;
  submission: Submission;
  gradingGroup: GradingGroup;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [autoGradingLoading, setAutoGradingLoading] = useState(false);
  const [loadingAiFeedback, setLoadingAiFeedback] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [semesterEnded, setSemesterEnded] = useState(false);
  const [autoGradingPollIntervalRef, setAutoGradingPollIntervalRef] = useState<NodeJS.Timeout | null>(null);
  const pollingSessionIdRef = useRef<number | null>(null);
  const hasShownCompletionMessageRef = useRef<boolean>(false);
  
  const [userEdits, setUserEdits] = useState<{
    rubricScores: Record<string, number>;
    rubricComments: Record<number, string>;
  }>({
    rubricScores: {},
    rubricComments: {},
  });
  
  const [feedback, setFeedback] = useState<FeedbackData>({
    overallFeedback: "",
    strengths: "",
    weaknesses: "",
    codeQuality: "",
    algorithmEfficiency: "",
    suggestionsForImprovement: "",
    bestPractices: "",
    errorHandling: "",
  });
  
  const [submissionFeedbackId, setSubmissionFeedbackId] = useState<number | null>(null);
  const [gradingHistoryModalVisible, setGradingHistoryModalVisible] = useState(false);

  // Reset when submission changes
  useEffect(() => {
    if (submission) {
      setUserEdits({
        rubricScores: {},
        rubricComments: {},
      });
      setFeedback({
        overallFeedback: "",
        strengths: "",
        weaknesses: "",
        codeQuality: "",
        algorithmEfficiency: "",
        suggestionsForImprovement: "",
        bestPractices: "",
        errorHandling: "",
      });
      setSubmissionFeedbackId(null);
      setTotalScore(0);
      setSemesterEnded(false);
      
      if (autoGradingPollIntervalRef) {
        clearInterval(autoGradingPollIntervalRef);
        setAutoGradingPollIntervalRef(null);
      }
      hasShownCompletionMessageRef.current = false;
      pollingSessionIdRef.current = null;
      message.destroy();
      setAutoGradingLoading(false);
    }
  }, [submission?.id]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (autoGradingPollIntervalRef) {
        clearInterval(autoGradingPollIntervalRef);
        setAutoGradingPollIntervalRef(null);
      }
      message.destroy();
    };
  }, [autoGradingPollIntervalRef]);

  // Fetch assessment template
  const { data: templatesResponse } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: visible && !!gradingGroup?.assessmentTemplateId,
  });

  const assessmentTemplate = useMemo(() => {
    if (!templatesResponse?.items || !gradingGroup?.assessmentTemplateId) return null;
    return templatesResponse.items.find((t) => t.id === gradingGroup.assessmentTemplateId) || null;
  }, [templatesResponse, gradingGroup?.assessmentTemplateId]);

  // Fetch papers
  const { data: papersResponse } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(assessmentTemplate?.id!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplate!.id,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: visible && !!assessmentTemplate?.id,
  });

  const papers = papersResponse?.items || [];

  // Fetch questions for all papers
  const questionsQueries = useQueries({
    queries: papers.map((paper) => ({
      queryKey: queryKeys.assessmentQuestions.byPaperId(paper.id),
      queryFn: () => assessmentQuestionService.getAssessmentQuestions({
        assessmentPaperId: paper.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: visible && papers.length > 0,
    })),
  });

  const allQuestionsFromQueries = useMemo(() => {
    const questions: AssessmentQuestion[] = [];
    questionsQueries.forEach((query) => {
      if (query.data?.items) {
        questions.push(...query.data.items);
      }
    });
    return questions.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
  }, [questionsQueries]);

  const rubricsQueries = useQueries({
    queries: allQuestionsFromQueries.map((question) => ({
      queryKey: queryKeys.rubricItems.byQuestionId(question.id),
      queryFn: () => rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: question.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: visible && allQuestionsFromQueries.length > 0,
    })),
  });

  const questionsWithRubrics = useMemo(() => {
    const result: QuestionWithRubrics[] = [];
    allQuestionsFromQueries.forEach((question, index) => {
      const rubrics = rubricsQueries[index]?.data?.items || [];
      if (rubrics.length > 0) {
        result.push({
          ...question,
          rubrics,
          rubricScores: {},
          rubricComments: {},
        });
      }
    });
    return result;
  }, [allQuestionsFromQueries, rubricsQueries]);

  // Fetch latest grading session
  const { data: gradingSessionsData } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 100 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: submission.id,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: visible && !!submission.id,
  });

  const latestGradingSession = useMemo(() => {
    if (!gradingSessionsData?.items || gradingSessionsData.items.length === 0) return null;
    const sorted = [...gradingSessionsData.items].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    return sorted[0];
  }, [gradingSessionsData]);

  // Fetch grade items for latest session
  const { data: gradeItemsData } = useQuery({
    queryKey: ['gradeItems', 'byGradingSessionId', latestGradingSession?.id],
    queryFn: () => gradeItemService.getGradeItems({
      gradingSessionId: latestGradingSession!.id,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: visible && !!latestGradingSession?.id,
  });

  const latestGradeItems = gradeItemsData?.items || [];

  // Reset user edits when submission changes
  useEffect(() => {
    setUserEdits({
      rubricScores: {},
      rubricComments: {},
    });
  }, [submission.id]);

  // Update questions with grade items data
  const questions = useMemo(() => {
    if (questionsWithRubrics.length === 0) return [];
    
    if (latestGradeItems.length > 0) {
      const sortedItems = [...latestGradeItems].sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        const createdA = new Date(a.createdAt).getTime();
        const createdB = new Date(b.createdAt).getTime();
        return createdB - createdA;
      });

      const latestGradeItemsMap = new Map<number, GradeItem>();
      sortedItems.forEach((item) => {
        if (item.rubricItemId && !latestGradeItemsMap.has(item.rubricItemId)) {
          latestGradeItemsMap.set(item.rubricItemId, item);
        }
      });

      const latestGradeItemsForDisplay = Array.from(latestGradeItemsMap.values());

      return questionsWithRubrics.map((question) => {
        const newRubricScores = { ...question.rubricScores };
        const newRubricComments = { ...(question.rubricComments || {}) };

        let questionComment = "";
        question.rubrics.forEach((rubric) => {
          const matchingGradeItem = latestGradeItemsForDisplay.find(
            (item) => item.rubricItemId === rubric.id
          );
          if (matchingGradeItem) {
            const editKey = `${question.id}_${rubric.id}`;
            newRubricScores[rubric.id] = userEdits.rubricScores[editKey] !== undefined 
              ? userEdits.rubricScores[editKey] 
              : matchingGradeItem.score;
            if (!questionComment && matchingGradeItem.comments) {
              questionComment = matchingGradeItem.comments;
            }
          } else {
            const editKey = `${question.id}_${rubric.id}`;
            if (userEdits.rubricScores[editKey] !== undefined) {
              newRubricScores[rubric.id] = userEdits.rubricScores[editKey];
            }
          }
        });

        newRubricComments[question.id] = userEdits.rubricComments[question.id] !== undefined
          ? userEdits.rubricComments[question.id]
          : questionComment;

        return {
          ...question,
          rubricScores: newRubricScores,
          rubricComments: newRubricComments,
        };
      });
    }
    
    return questionsWithRubrics.map((question) => {
      const newRubricScores = { ...question.rubricScores };
      const newRubricComments = { ...(question.rubricComments || {}) };

      question.rubrics.forEach((rubric) => {
        const editKey = `${question.id}_${rubric.id}`;
        if (userEdits.rubricScores[editKey] !== undefined) {
          newRubricScores[rubric.id] = userEdits.rubricScores[editKey];
        }
      });

      if (userEdits.rubricComments[question.id] !== undefined) {
        newRubricComments[question.id] = userEdits.rubricComments[question.id];
      }

      return {
        ...question,
        rubricScores: newRubricScores,
        rubricComments: newRubricComments,
      };
    });
  }, [questionsWithRubrics, latestGradeItems, userEdits]);

  // Calculate total score
  useEffect(() => {
    if (latestGradeItems.length > 0) {
      const total = latestGradeItems.reduce((sum, item) => sum + item.score, 0);
      setTotalScore(total);
    } else if (latestGradingSession) {
      setTotalScore(latestGradingSession.grade || 0);
    } else {
      setTotalScore(0);
    }
  }, [latestGradeItems, latestGradingSession]);

  // Fetch feedback
  useEffect(() => {
    if (visible && submission.id) {
      fetchFeedback(submission.id);
    }
  }, [visible, submission.id]);

  const fetchFeedback = async (submissionId: number) => {
    try {
      setLoadingFeedback(true);
      const feedbackList = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submissionId,
      });

      if (feedbackList.length > 0) {
        const existingFeedback = feedbackList[0];
        setSubmissionFeedbackId(existingFeedback.id);
        
        let parsedFeedback: FeedbackData | null = deserializeFeedback(existingFeedback.feedbackText);
        
        if (parsedFeedback === null) {
          try {
            parsedFeedback = await geminiService.formatFeedback(existingFeedback.feedbackText);
          } catch (error: any) {
            console.error("Failed to parse feedback with Gemini:", error);
            parsedFeedback = {
              overallFeedback: existingFeedback.feedbackText,
              strengths: "",
              weaknesses: "",
              codeQuality: "",
              algorithmEfficiency: "",
              suggestionsForImprovement: "",
              bestPractices: "",
              errorHandling: "",
            };
          }
        }
        
        if (parsedFeedback) {
          setFeedback(parsedFeedback);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch feedback:", error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const serializeFeedback = (feedbackData: FeedbackData): string => {
    return JSON.stringify(feedbackData);
  };

  const deserializeFeedback = (feedbackText: string): FeedbackData | null => {
    if (!feedbackText || feedbackText.trim() === "") {
      return {
        overallFeedback: "",
        strengths: "",
        weaknesses: "",
        codeQuality: "",
        algorithmEfficiency: "",
        suggestionsForImprovement: "",
        bestPractices: "",
        errorHandling: "",
      };
    }

    try {
      const parsed = JSON.parse(feedbackText);
      if (typeof parsed === "object" && parsed !== null) {
        return {
          overallFeedback: parsed.overallFeedback || "",
          strengths: parsed.strengths || "",
          weaknesses: parsed.weaknesses || "",
          codeQuality: parsed.codeQuality || "",
          algorithmEfficiency: parsed.algorithmEfficiency || "",
          suggestionsForImprovement: parsed.suggestionsForImprovement || "",
          bestPractices: parsed.bestPractices || "",
          errorHandling: parsed.errorHandling || "",
        };
      }
      throw new Error("Parsed result is not an object");
    } catch (error) {
      return null;
    }
  };

  const saveFeedback = async (feedbackData: FeedbackData) => {
    const feedbackText = serializeFeedback(feedbackData);

    if (submissionFeedbackId) {
      await submissionFeedbackService.updateSubmissionFeedback(submissionFeedbackId, {
        feedbackText: feedbackText,
      });
    } else {
      const newFeedback = await submissionFeedbackService.createSubmissionFeedback({
        submissionId: submission.id,
        feedbackText: feedbackText,
      });
      setSubmissionFeedbackId(newFeedback.id);
    }
  };

  const handleSave = async () => {
    if (!submission || !user?.id) {
      message.error("Submission or User ID not found");
      return;
    }

    if (semesterEnded) {
      message.warning("Cannot save grade when the semester has ended");
      return;
    }

    try {
      setSaving(true);

      const calculatedTotal = questions.reduce((sum, question) => {
        const questionTotal = Object.values(question.rubricScores).reduce(
          (qSum, score) => qSum + (score || 0),
          0
        );
        return sum + questionTotal;
      }, 0);

      let gradingSessionId: number;
      if (latestGradingSession) {
        gradingSessionId = latestGradingSession.id;
      } else {
        if (!gradingGroup?.assessmentTemplateId) {
          message.error("Cannot find assessment template. Please contact administrator.");
          setSaving(false);
          return;
        }

        await gradingService.createGrading({
          submissionId: submission.id,
          assessmentTemplateId: gradingGroup.assessmentTemplateId,
        });

        const gradingSessionsResult = await gradingService.getGradingSessions({
          submissionId: submission.id,
          pageNumber: 1,
          pageSize: 100,
        });

        if (gradingSessionsResult.items.length > 0) {
          const sortedSessions = [...gradingSessionsResult.items].sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
          gradingSessionId = sortedSessions[0].id;
        } else {
          message.error("Failed to create grading session");
          setSaving(false);
          return;
        }
      }

      for (const question of questions) {
        const questionComment = question.rubricComments?.[question.id] || "";

        for (const rubric of question.rubrics) {
          const score = question.rubricScores[rubric.id] || 0;
          const existingGradeItem = latestGradeItems.find(
            (item) => item.rubricItemId === rubric.id
          );

          if (existingGradeItem) {
            await gradeItemService.updateGradeItem(existingGradeItem.id, {
              score: score,
              comments: questionComment,
            });
          } else {
            await gradeItemService.createGradeItem({
              gradingSessionId: gradingSessionId,
              rubricItemId: rubric.id,
              score: score,
              comments: questionComment,
            });
          }
        }
      }

      await gradingService.updateGradingSession(gradingSessionId, {
        grade: calculatedTotal,
        status: 1,
      });

      message.success("Grade saved successfully");

      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 100 }) });
      queryClient.invalidateQueries({ queryKey: ['gradeItems', 'byGradingSessionId'] });
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroupId'] });
      queryClient.invalidateQueries({ queryKey: ['submissionFeedback', 'bySubmissionId', submission.id] });
    } catch (err: any) {
      console.error("Failed to save grade:", err);
      message.error(err.message || "Failed to save grade");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoGrading = async () => {
    if (!submission || !gradingGroup?.assessmentTemplateId) {
      message.error("Submission or assessment template not found");
      return;
    }

    if (semesterEnded) {
      message.warning("Cannot use auto grading when the semester has ended");
      return;
    }

    if (autoGradingPollIntervalRef) {
      clearInterval(autoGradingPollIntervalRef);
      setAutoGradingPollIntervalRef(null);
    }
    
    hasShownCompletionMessageRef.current = false;

    try {
      setAutoGradingLoading(true);

      const gradingSession = await gradingService.autoGrading({
        submissionId: submission.id,
        assessmentTemplateId: gradingGroup.assessmentTemplateId,
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 1000 }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 100 }) });
      queryClient.invalidateQueries({ queryKey: ['gradeItems', 'byGradingSessionId'] });
      queryClient.invalidateQueries({ queryKey: ['gradeItemHistory'] });

      if (gradingSession.status === 0) {
        pollingSessionIdRef.current = gradingSession.id;
        hasShownCompletionMessageRef.current = false;
        
        const loadingMessageKey = `auto-grading-${gradingSession.id}`;
        message.loading({ content: "Auto grading in progress...", key: loadingMessageKey, duration: 0 });
        
        const pollInterval = setInterval(async () => {
          if (hasShownCompletionMessageRef.current || pollingSessionIdRef.current !== gradingSession.id) {
            clearInterval(pollInterval);
            setAutoGradingPollIntervalRef(null);
            return;
          }

          try {
            const sessionsResult = await gradingService.getGradingSessions({
              submissionId: submission.id,
              pageNumber: 1,
              pageSize: 100,
            });

            const targetSession = sessionsResult.items.find(s => s.id === pollingSessionIdRef.current);

            if (targetSession && pollingSessionIdRef.current === gradingSession.id) {
              if (targetSession.status !== 0) {
                hasShownCompletionMessageRef.current = true;
                clearInterval(pollInterval);
                setAutoGradingPollIntervalRef(null);
                pollingSessionIdRef.current = null;
                setAutoGradingLoading(false);
                
                queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 1000 }) });
                queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 100 }) });
                queryClient.invalidateQueries({ queryKey: ['gradeItems', 'byGradingSessionId'] });
                queryClient.invalidateQueries({ queryKey: ['gradeItemHistory'] });
                
                if (targetSession.status === 1) {
                  message.success({ content: "Auto grading completed successfully", key: loadingMessageKey, duration: 3 });
                } else if (targetSession.status === 2) {
                  message.error({ content: "Auto grading failed", key: loadingMessageKey, duration: 3 });
                }
              }
            } else if (!targetSession) {
              hasShownCompletionMessageRef.current = true;
              clearInterval(pollInterval);
              setAutoGradingPollIntervalRef(null);
              pollingSessionIdRef.current = null;
              message.destroy(loadingMessageKey);
              setAutoGradingLoading(false);
            }
          } catch (err: any) {
            console.error("Failed to poll grading status:", err);
            if (!hasShownCompletionMessageRef.current && pollingSessionIdRef.current === gradingSession.id) {
              hasShownCompletionMessageRef.current = true;
              clearInterval(pollInterval);
              setAutoGradingPollIntervalRef(null);
              message.destroy(loadingMessageKey);
              setAutoGradingLoading(false);
              message.error(err.message || "Failed to check grading status");
            }
          }
        }, 2000);

        setAutoGradingPollIntervalRef(pollInterval);

        setTimeout(() => {
          if (!hasShownCompletionMessageRef.current && pollingSessionIdRef.current === gradingSession.id) {
            hasShownCompletionMessageRef.current = true;
            clearInterval(pollInterval);
            setAutoGradingPollIntervalRef(null);
            pollingSessionIdRef.current = null;
            message.destroy(loadingMessageKey);
            setAutoGradingLoading(false);
            message.warning("Auto grading is taking longer than expected. Please check the status manually.");
          }
        }, 300000);
      } else {
        setAutoGradingLoading(false);
        queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 1000 }) });
        queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 100 }) });
        queryClient.invalidateQueries({ queryKey: ['gradeItems', 'byGradingSessionId'] });
        queryClient.invalidateQueries({ queryKey: ['gradeItemHistory'] });
        
        if (gradingSession.status === 1) {
          message.success("Auto grading completed successfully");
        } else if (gradingSession.status === 2) {
          message.error("Auto grading failed");
        }
      }
    } catch (err: any) {
      console.error("Failed to start auto grading:", err);
      message.error(err.message || "Failed to start auto grading");
      setAutoGradingLoading(false);
    }
  };

  const handleGetAiFeedback = async () => {
    if (!submission) {
      message.error("No submission selected");
      return;
    }

    if (semesterEnded) {
      message.warning("Cannot use AI feedback when the semester has ended");
      return;
    }

    try {
      setLoadingAiFeedback(true);
      const formattedFeedback = await gradingService.getFormattedAiFeedback(submission.id, "OpenAI");
      setFeedback(formattedFeedback);
      await saveFeedback(formattedFeedback);
      message.success("AI feedback retrieved and saved successfully!");
    } catch (error: any) {
      console.error("Failed to get AI feedback:", error);
      let errorMessage = "Failed to get AI feedback. Please try again.";
      if (error?.response?.data?.errorMessages) {
        errorMessage = error.response.data.errorMessages.join(", ");
      } else if (error?.message) {
        errorMessage = error.message;
      }
      message.error(errorMessage);
    } finally {
      setLoadingAiFeedback(false);
    }
  };

  const handleFeedbackChange = (field: keyof FeedbackData, value: string) => {
    setFeedback((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveFeedback = async () => {
    if (!submission) {
      message.error("No submission selected");
      return;
    }

    try {
      await saveFeedback(feedback);
      message.success("Feedback saved successfully");
    } catch (error: any) {
      console.error("Failed to save feedback:", error);
      message.error(error?.message || "Failed to save feedback");
    }
  };

  const renderFeedbackFields = (feedbackData: FeedbackData) => {
    const fields: Array<{ key: keyof FeedbackData; label: string; rows: number; fullWidth?: boolean }> = [
      { key: "overallFeedback", label: "Overall Feedback", rows: 6, fullWidth: true },
      { key: "strengths", label: "Strengths", rows: 8 },
      { key: "weaknesses", label: "Weaknesses", rows: 8 },
      { key: "codeQuality", label: "Code Quality", rows: 6 },
      { key: "algorithmEfficiency", label: "Algorithm Efficiency", rows: 6 },
      { key: "suggestionsForImprovement", label: "Suggestions for Improvement", rows: 6, fullWidth: true },
      { key: "bestPractices", label: "Best Practices", rows: 5 },
      { key: "errorHandling", label: "Error Handling", rows: 5 },
    ];

    const elements: React.ReactNode[] = [];
    let currentRow: Array<typeof fields[0]> = [];

    fields.forEach((field, index) => {
      const value = feedbackData[field.key] || "";

      if (field.fullWidth) {
        if (currentRow.length > 0) {
          if (currentRow.length === 1) {
            elements.push(
              <div key={`field-${currentRow[0].key}`}>
                <Title level={5}>{currentRow[0].label}</Title>
                <TextArea
                  rows={currentRow[0].rows}
                  value={feedbackData[currentRow[0].key] || ""}
                  onChange={(e) => handleFeedbackChange(currentRow[0].key, e.target.value)}
                  placeholder={`Enter ${currentRow[0].label.toLowerCase()}...`}
                  disabled={semesterEnded}
                />
              </div>
            );
          } else {
            elements.push(
              <Row gutter={16} key={`row-${index}`}>
                {currentRow.map((f) => (
                  <Col xs={24} md={12} key={f.key}>
                    <div>
                      <Title level={5}>{f.label}</Title>
                      <TextArea
                        rows={f.rows}
                        value={feedbackData[f.key] || ""}
                        onChange={(e) => handleFeedbackChange(f.key, e.target.value)}
                        placeholder={`Enter ${f.label.toLowerCase()}...`}
                        disabled={semesterEnded}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            );
          }
          currentRow = [];
        }

        elements.push(
          <div key={`field-${field.key}`}>
            <Title level={5}>{field.label}</Title>
            <TextArea
              rows={field.rows}
              value={value}
              onChange={(e) => handleFeedbackChange(field.key, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
              disabled={semesterEnded}
            />
          </div>
        );
      } else {
        currentRow.push(field);

        if (currentRow.length === 2 || index === fields.length - 1) {
          if (currentRow.length === 1) {
            elements.push(
              <div key={`field-${currentRow[0].key}`}>
                <Title level={5}>{currentRow[0].label}</Title>
                <TextArea
                  rows={currentRow[0].rows}
                  value={feedbackData[currentRow[0].key] || ""}
                  onChange={(e) => handleFeedbackChange(currentRow[0].key, e.target.value)}
                  placeholder={`Enter ${currentRow[0].label.toLowerCase()}...`}
                  disabled={semesterEnded}
                />
              </div>
            );
          } else {
            elements.push(
              <Row gutter={16} key={`row-${index}`}>
                {currentRow.map((f) => (
                  <Col xs={24} md={12} key={f.key}>
                    <div>
                      <Title level={5}>{f.label}</Title>
                      <TextArea
                        rows={f.rows}
                        value={feedbackData[f.key] || ""}
                        onChange={(e) => handleFeedbackChange(f.key, e.target.value)}
                        placeholder={`Enter ${f.label.toLowerCase()}...`}
                        disabled={semesterEnded}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            );
          }
          currentRow = [];
        }
      }
    });

    return elements;
  };

  const updateRubricScore = (questionId: number, rubricId: number, score: number) => {
    const editKey = `${questionId}_${rubricId}`;
    setUserEdits((prev) => ({
      ...prev,
      rubricScores: {
        ...prev.rubricScores,
        [editKey]: score,
      },
    }));
  };

  const updateQuestionComment = (questionId: number, comment: string) => {
    setUserEdits((prev) => ({
      ...prev,
      rubricComments: {
        ...prev.rubricComments,
        [questionId]: comment,
      },
    }));
  };

  const maxScore = questions.reduce((sum, q) => {
    return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
  }, 0);

  return (
    <Modal
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Edit Submission - {submission.studentCode} - {submission.studentName}
          </Title>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1400}
      style={{ top: 20 }}
    >
      <Spin spinning={loadingFeedback || loadingAiFeedback}>
        <Space direction="vertical" size="large" style={{ width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
          {semesterEnded && (
            <Alert
              message="Semester has ended. Grading modifications are disabled."
              type="warning"
              showIcon
            />
          )}

          {/* Submission Info */}
          <Card size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Text type="secondary">Student Code:</Text>
                <br />
                <Text strong>{submission.studentCode}</Text>
              </Col>
              <Col span={6}>
                <Text type="secondary">Student Name:</Text>
                <br />
                <Text strong>{submission.studentName}</Text>
              </Col>
              <Col span={6}>
                <Text type="secondary">Submitted At:</Text>
                <br />
                <Text>
                  {submission.submittedAt
                    ? dayjs.utc(submission.submittedAt).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")
                    : "N/A"}
                </Text>
              </Col>
              <Col span={6}>
                <Text type="secondary">Total Score:</Text>
                <br />
                <Text strong style={{ fontSize: 18, color: "#52c41a" }}>
                  {maxScore > 0 ? `${totalScore.toFixed(2)}/${maxScore.toFixed(2)}` : totalScore.toFixed(2)}
                </Text>
              </Col>
            </Row>
          </Card>

          {/* Grading Details Section */}
          <Card>
            <Collapse
              defaultActiveKey={["grading-details"]}
              items={[
                {
                  key: "grading-details",
                  label: (
                    <Title level={4} style={{ margin: 0 }}>
                      Grading Details
                    </Title>
                  ),
                  children: (
                    <div>
                      {/* Grading Logs Section */}
                      {latestGradingSession && latestGradingSession.gradingLogs && latestGradingSession.gradingLogs.length > 0 && (
                        <Alert
                          message="Grading Notes"
                          description={
                            <div>
                              {latestGradingSession.gradingLogs.map((log, index) => (
                                <div key={log.id} style={{ marginBottom: index < latestGradingSession.gradingLogs.length - 1 ? 12 : 0 }}>
                                  <div style={{ marginBottom: 4 }}>
                                    <Tag color="blue">{log.action}</Tag>
                                    <Text type="secondary" style={{ fontSize: "12px", marginLeft: 8 }}>
                                      {toVietnamTime(log.timestamp).format("DD/MM/YYYY HH:mm:ss")}
                                    </Text>
                                  </div>
                                  <Text style={{ fontSize: "13px", whiteSpace: "pre-wrap" }}>
                                    {log.details}
                                  </Text>
                                  {index < latestGradingSession.gradingLogs.length - 1 && <Divider style={{ margin: "8px 0" }} />}
                                </div>
                              ))}
                            </div>
                          }
                          type="info"
                          showIcon
                          style={{ marginBottom: 16 }}
                        />
                      )}
                      <Row gutter={16}>
                        <Col xs={24} md={6} lg={6}>
                          <div>
                            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                              Total Questions: {questions.length}
                            </Text>
                            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                              Total Max Score: {maxScore.toFixed(2)}
                            </Text>
                            <Space direction="vertical" style={{ width: "100%" }}>
                              <Button
                                type="default"
                                icon={<RobotOutlined />}
                                onClick={handleAutoGrading}
                                loading={autoGradingLoading}
                                disabled={semesterEnded}
                                block
                              >
                                Auto Grading
                              </Button>
                              <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={handleSave}
                                loading={saving}
                                disabled={semesterEnded}
                                block
                              >
                                Save Grade
                              </Button>
                              <Button
                                type="default"
                                icon={<RobotOutlined />}
                                onClick={handleGetAiFeedback}
                                loading={loadingAiFeedback}
                                disabled={semesterEnded}
                                block
                              >
                                Get AI Feedback
                              </Button>
                              <Button
                                type="default"
                                icon={<HistoryOutlined />}
                                onClick={() => setGradingHistoryModalVisible(true)}
                                block
                              >
                                Grading History
                              </Button>
                            </Space>
                          </div>
                        </Col>
                        <Col xs={24} md={18} lg={18}>
                          {(() => {
                            const sortedQuestions = [...questions].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));

                            const renderQuestionCollapse = (question: QuestionWithRubrics, index: number) => {
                              const questionTotalScore = Object.values(question.rubricScores).reduce(
                                (sum, score) => sum + (score || 0),
                                0
                              );
                              const questionMaxScore = question.rubrics.reduce(
                                (sum, r) => sum + r.score,
                                0
                              );

                              return {
                                key: `question-${index}`,
                                label: (
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>
                                      <strong>Question {index + 1}:</strong> {question.questionText}
                                    </span>
                                    <Space>
                                      <Tag color="blue">
                                        Score: {questionTotalScore.toFixed(2)}/{questionMaxScore.toFixed(2)}
                                      </Tag>
                                    </Space>
                                  </div>
                                ),
                                children: (
                                  <div>
                                    {question.questionSampleInput && (
                                      <div style={{ marginBottom: 16 }}>
                                        <Text strong>Sample Input:</Text>
                                        <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
                                          {question.questionSampleInput}
                                        </pre>
                                      </div>
                                    )}
                                    {question.questionSampleOutput && (
                                      <div style={{ marginBottom: 16 }}>
                                        <Text strong>Sample Output:</Text>
                                        <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
                                          {question.questionSampleOutput}
                                        </pre>
                                      </div>
                                    )}
                                    <Divider />
                                    <div style={{ marginBottom: 16 }}>
                                      <Text strong>Criteria:</Text>
                                      <Table
                                        dataSource={question.rubrics}
                                        rowKey="id"
                                        pagination={false}
                                        columns={[
                                          {
                                            title: "Description",
                                            dataIndex: "description",
                                            key: "description",
                                            width: "50%",
                                          },
                                          {
                                            title: "Max Score",
                                            dataIndex: "score",
                                            key: "score",
                                            width: "15%",
                                            render: (score: number) => (
                                              <Tag color="green">{score}</Tag>
                                            ),
                                          },
                                          {
                                            title: "Score",
                                            key: "rubricScore",
                                            width: "20%",
                                            render: (_: any, rubric: RubricItem) => (
                                              <InputNumber
                                                min={0}
                                                max={rubric.score}
                                                value={question.rubricScores[rubric.id] || 0}
                                                onChange={(value) =>
                                                  updateRubricScore(question.id, rubric.id, value || 0)
                                                }
                                                disabled={semesterEnded}
                                                style={{ width: "100%" }}
                                              />
                                            ),
                                          },
                                          {
                                            title: "Input",
                                            dataIndex: "input",
                                            key: "input",
                                            width: "15%",
                                            render: (text: string) => (
                                              <Text code style={{ fontSize: "12px" }}>
                                                {text || "N/A"}
                                              </Text>
                                            ),
                                          },
                                        ]}
                                      />
                                    </div>
                                    <div>
                                      <Text strong>Comments:</Text>
                                      <TextArea
                                        rows={3}
                                        value={question.rubricComments?.[question.id] || ""}
                                        onChange={(e) => updateQuestionComment(question.id, e.target.value)}
                                        disabled={semesterEnded}
                                        placeholder="Enter comments for this question..."
                                      />
                                    </div>
                                  </div>
                                ),
                              };
                            };

                            return (
                              <Collapse
                                items={sortedQuestions.map((question, index) =>
                                  renderQuestionCollapse(question, index)
                                )}
                              />
                            );
                          })()}
                        </Col>
                      </Row>
                    </div>
                  ),
                },
              ]}
            />
          </Card>

          {/* Feedback Section */}
          <Card>
            <Collapse
              defaultActiveKey={[]}
              items={[
                {
                  key: "feedback",
                  label: (
                    <Title level={4} style={{ margin: 0 }}>
                      Detailed Feedback
                    </Title>
                  ),
                  children: (
                    <div>
                      <Space direction="horizontal" style={{ width: "100%", marginBottom: 16, justifyContent: "space-between" }}>
                        <Text type="secondary">
                          Provide comprehensive feedback for the student's submission
                        </Text>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          onClick={handleSaveFeedback}
                          disabled={loadingFeedback || loadingAiFeedback || semesterEnded}
                        >
                          Save Feedback
                        </Button>
                      </Space>
                      <Space direction="vertical" size="large" style={{ width: "100%" }}>
                        {renderFeedbackFields(feedback)}
                      </Space>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Space>
      </Spin>

      {/* Grading History Modal */}
      {submission && (
        <GradingHistoryModal
          visible={gradingHistoryModalVisible}
          onClose={() => setGradingHistoryModalVisible(false)}
          submissionId={submission.id}
        />
      )}
    </Modal>
  );
}

// Grading History Modal Component
function GradingHistoryModal({
  visible,
  onClose,
  submissionId,
}: {
  visible: boolean;
  onClose: () => void;
  submissionId: number;
}) {
  const { message } = App.useApp();
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [gradeItemHistoryModalVisible, setGradeItemHistoryModalVisible] = useState(false);
  const [selectedGradeItem, setSelectedGradeItem] = useState<GradeItem | null>(null);

  // Fetch grading history using TanStack Query
  const { data: gradingHistoryData, isLoading: loadingGradingHistory } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId, pageNumber: 1, pageSize: 1000 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: submissionId,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: visible && !!submissionId,
  });

  const gradingHistory = useMemo(() => {
    if (!gradingHistoryData?.items) return [];
    return [...gradingHistoryData.items].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order
    });
  }, [gradingHistoryData]);

  // Fetch grade items for expanded sessions
  const expandedSessionIds = Array.from(expandedSessions);
  const gradeItemsQueries = useQueries({
    queries: expandedSessionIds.map((sessionId) => ({
      queryKey: ['gradeItems', 'byGradingSessionId', sessionId],
      queryFn: () => gradeItemService.getGradeItems({
        gradingSessionId: sessionId,
        pageNumber: 1,
        pageSize: 1000,
      }),
      enabled: visible && expandedSessions.has(sessionId),
    })),
  });

  const sessionGradeItems = useMemo(() => {
    const map: { [sessionId: number]: GradeItem[] } = {};
    expandedSessionIds.forEach((sessionId, index) => {
      if (gradeItemsQueries[index]?.data?.items) {
        map[sessionId] = gradeItemsQueries[index].data.items;
      }
    });
    return map;
  }, [expandedSessionIds, gradeItemsQueries]);

  // Fetch grade item history
  const { data: gradeItemHistoryData, isLoading: loadingGradeItemHistory } = useQuery({
    queryKey: ['gradeItemHistory', selectedGradeItem?.gradingSessionId, selectedGradeItem?.rubricItemDescription],
    queryFn: async () => {
      if (!selectedGradeItem) return { items: [] };
      const result = await gradeItemService.getGradeItems({
        gradingSessionId: selectedGradeItem.gradingSessionId,
        pageNumber: 1,
        pageSize: 1000,
      });
      const filteredItems = result.items.filter(
        (item) => item.rubricItemDescription === selectedGradeItem.rubricItemDescription
      );
      return {
        items: [...filteredItems].sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          if (dateB !== dateA) {
            return dateB - dateA;
          }
          const createdA = new Date(a.createdAt).getTime();
          const createdB = new Date(b.createdAt).getTime();
          return createdB - createdA;
        }),
      };
    },
    enabled: visible && gradeItemHistoryModalVisible && !!selectedGradeItem,
  });

  const gradeItemHistory = gradeItemHistoryData?.items || [];

  const { Title, Text } = Typography;

  const getGradingTypeLabel = (type: number) => {
    switch (type) {
      case 0:
        return "AI";
      case 1:
        return "LECTURER";
      case 2:
        return "BOTH";
      default:
        return "UNKNOWN";
    }
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0:
        return <Tag color="processing">PROCESSING</Tag>;
      case 1:
        return <Tag color="success">COMPLETED</Tag>;
      case 2:
        return <Tag color="error">FAILED</Tag>;
      default:
        return <Tag>UNKNOWN</Tag>;
    }
  };

  const toVietnamTime = (dateString: string) => {
    return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
  };

  const handleExpandSession = (sessionId: number) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const handleOpenGradeItemHistory = (gradeItem: GradeItem) => {
    setSelectedGradeItem(gradeItem);
    setGradeItemHistoryModalVisible(true);
  };

  const columns = [
    {
      title: "Rubric Item",
      dataIndex: "rubricItemDescription",
      key: "rubricItemDescription",
      width: "25%",
    },
    {
      title: "Question",
      dataIndex: "questionText",
      key: "questionText",
      width: "15%",
      render: (text: string) => text || "N/A",
    },
    {
      title: "Max Score",
      dataIndex: "rubricItemMaxScore",
      key: "rubricItemMaxScore",
      width: "12%",
      align: "center" as const,
      render: (score: number) => <Tag color="blue">{score.toFixed(2)}</Tag>,
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      width: "12%",
      align: "center" as const,
      render: (score: number) => <Tag color={score > 0 ? "green" : "default"}>{score.toFixed(2)}</Tag>,
    },
    {
      title: "Comments",
      dataIndex: "comments",
      key: "comments",
      width: "20%",
      render: (text: string) => (
        <Text
          style={{
            fontSize: "12px",
            whiteSpace: "normal",
            wordWrap: "break-word",
            wordBreak: "break-word"
          }}
        >
          {text || "N/A"}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: "16%",
      align: "center" as const,
      render: (_: any, record: GradeItem) => (
        <Button
          type="link"
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => handleOpenGradeItemHistory(record)}
        >
          Edit History
        </Button>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="Grading History"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
        ]}
        width={1200}
      >
        <Spin spinning={loadingGradingHistory}>
          {gradingHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Text type="secondary">No grading history available</Text>
            </div>
          ) : (
            <Collapse
              items={gradingHistory.map((session) => {
                const isExpanded = expandedSessions.has(session.id);
                const gradeItems = sessionGradeItems[session.id] || [];

                const totalScore = gradeItems.reduce((sum, item) => sum + item.score, 0);
                const maxScore = gradeItems.reduce((sum, item) => sum + (item.rubricItemMaxScore || 0), 0);

                return {
                  key: session.id.toString(),
                  label: (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                      <div>
                        <Text strong>Session #{session.id}</Text>
                        <Space style={{ marginLeft: 16 }}>
                          {getStatusLabel(session.status)}
                          <Tag>{getGradingTypeLabel(session.gradingType)}</Tag>
                          <Tag color="blue">Grade: {session.grade}</Tag>
                          {gradeItems.length > 0 && (
                            <Tag color="green">Total: {maxScore > 0 ? `${totalScore.toFixed(2)}/${maxScore.toFixed(2)}` : totalScore.toFixed(2)}</Tag>
                          )}
                        </Space>
                      </div>
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        {toVietnamTime(session.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Text>
                    </div>
                  ),
                  children: (
                    <div>
                      <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                        <Descriptions.Item label="Grading Session ID">{session.id}</Descriptions.Item>
                        <Descriptions.Item label="Status">{getStatusLabel(session.status)}</Descriptions.Item>
                        <Descriptions.Item label="Grading Type">
                          <Tag>{getGradingTypeLabel(session.gradingType)}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Grade">{session.grade}</Descriptions.Item>
                        <Descriptions.Item label="Grade Item Count">{session.gradeItemCount}</Descriptions.Item>
                        <Descriptions.Item label="Created At">
                          {toVietnamTime(session.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                        </Descriptions.Item>
                        <Descriptions.Item label="Updated At">
                          {toVietnamTime(session.updatedAt).format("DD/MM/YYYY HH:mm:ss")}
                        </Descriptions.Item>
                      </Descriptions>

                      {/* Grading Logs Section */}
                      {session.gradingLogs && session.gradingLogs.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <Title level={5} style={{ marginBottom: 8 }}>
                            Grading Logs ({session.gradingLogs.length})
                          </Title>
                          <Alert
                            message="Grading Notes"
                            description={
                              <div>
                                {session.gradingLogs.map((log, index) => (
                                  <div key={log.id} style={{ marginBottom: index < session.gradingLogs.length - 1 ? 12 : 0 }}>
                                    <div style={{ marginBottom: 4 }}>
                                      <Tag color="blue">{log.action}</Tag>
                                      <Text type="secondary" style={{ fontSize: "12px", marginLeft: 8 }}>
                                        {toVietnamTime(log.timestamp).format("DD/MM/YYYY HH:mm:ss")}
                                      </Text>
                                    </div>
                                    <Text style={{ fontSize: "13px", whiteSpace: "pre-wrap" }}>
                                      {log.details}
                                    </Text>
                                    {index < session.gradingLogs.length - 1 && <Divider style={{ margin: "8px 0" }} />}
                                  </div>
                                ))}
                              </div>
                            }
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                          />
                        </div>
                      )}

                      {!isExpanded ? (
                        <Button
                          type="link"
                          onClick={() => handleExpandSession(session.id)}
                          style={{ padding: 0 }}
                        >
                          View grade items details
                        </Button>
                      ) : (
                        <div>
                          <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>
                            Grade Items ({gradeItems.length})
                          </Title>
                          {gradeItems.length === 0 ? (
                            <Text type="secondary">No grade items</Text>
                          ) : (
                            <Table
                              columns={columns}
                              dataSource={gradeItems}
                              rowKey="id"
                              pagination={false}
                              size="small"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ),
                };
              })}
            />
          )}
        </Spin>
      </Modal>

      {/* Grade Item History Modal */}
      <Modal
        title={
          <div>
            <Text strong>Grade Item Edit History</Text>
            {selectedGradeItem && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: "12px" }}>
                  Rubric: {selectedGradeItem.rubricItemDescription} |
                  Total edits: {gradeItemHistory.length}
                </Text>
              </div>
            )}
          </div>
        }
        open={gradeItemHistoryModalVisible}
        onCancel={() => {
          setGradeItemHistoryModalVisible(false);
          setSelectedGradeItem(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setGradeItemHistoryModalVisible(false);
            setSelectedGradeItem(null);
          }}>
            Close
          </Button>,
        ]}
        width={900}
      >
        <Spin spinning={loadingGradeItemHistory}>
          {gradeItemHistory.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Text type="secondary">No edit history available</Text>
            </div>
          ) : (
            <Table
              columns={[
                {
                  title: "Edit #",
                  key: "index",
                  width: "8%",
                  align: "center" as const,
                  render: (_: any, __: any, index: number) => (
                    <Tag color={index === 0 ? "green" : "default"}>
                      {index + 1}
                    </Tag>
                  ),
                },
                {
                  title: "Score",
                  dataIndex: "score",
                  key: "score",
                  width: "15%",
                  align: "center" as const,
                  render: (score: number) => (
                    <Tag color={score > 0 ? "green" : "default"}>
                      {score.toFixed(2)}
                    </Tag>
                  ),
                },
                {
                  title: "Comments",
                  dataIndex: "comments",
                  key: "comments",
                  width: "35%",
                  render: (text: string) => (
                    <Text
                      style={{
                        fontSize: "12px",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        wordBreak: "break-word"
                      }}
                    >
                      {text || "N/A"}
                    </Text>
                  ),
                },
                {
                  title: "Updated At",
                  dataIndex: "updatedAt",
                  key: "updatedAt",
                  width: "21%",
                  render: (date: string) => (
                    <Text style={{ fontSize: "12px" }}>
                      {toVietnamTime(date).format("DD/MM/YYYY HH:mm:ss")}
                    </Text>
                  ),
                },
                {
                  title: "Created At",
                  dataIndex: "createdAt",
                  key: "createdAt",
                  width: "21%",
                  render: (date: string) => (
                    <Text style={{ fontSize: "12px" }}>
                      {toVietnamTime(date).format("DD/MM/YYYY HH:mm:ss")}
                    </Text>
                  ),
                },
              ]}
              dataSource={gradeItemHistory}
              rowKey="id"
              pagination={false}
              size="small"
            />
          )}
        </Spin>
      </Modal>
    </>
  );
}