"use client";

import { Alert, App, Button, Card, Space, Spin, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import styles from "./page.module.css";
import { useAuth } from "@/hooks/useAuth";
import { isSemesterPassed } from "./utils/dateUtils";
import { exportGradeReport } from "./utils/exportGradeReportUtils";
import { EditSubmissionModal } from "./components/EditSubmissionModal";
import { UploadGradeSheetModal } from "./components/UploadGradeSheetModal";
import { SubmissionsTable } from "./components/SubmissionsTable";
import { GradingGroupHeader } from "./components/GradingGroupHeader";
import { Submission, submissionService } from "@/services/submissionService";
import { gradingGroupService, GradingGroup } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import { semesterService } from "@/services/semesterService";
import { courseElementService } from "@/services/courseElementService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import { rubricItemService } from "@/services/rubricItemService";
import { gradeItemService } from "@/services/gradeItemService";
import { handleDownloadAll, handleDownloadSelected } from "./utils/downloadAll";

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
  const [selectedSubmissions, setSelectedSubmissions] = useState<Submission[]>([]);
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


  const isGradeSheetSubmitted = useMemo(() => {
    return !!(gradingGroup?.submittedGradeSheetUrl || gradingGroup?.gradeSheetSubmittedAt);
  }, [gradingGroup]);

  const title = useMemo(() => {
    return gradingGroup?.assessmentTemplateName || "Grading Group";
  }, [gradingGroup?.assessmentTemplateName]);


  useEffect(() => {
    if (!gradingGroup && gradingGroupId && !isLoadingGradingGroups) {
      message.error("Grading group not found");
      router.back();
    }

  }, [gradingGroup, gradingGroupId, isLoadingGradingGroups]);


  const { data: allSubmissionsData = [] } = useQuery({
    queryKey: ['submissions', 'byGradingGroupId', gradingGroupId],
    queryFn: () => submissionService.getSubmissionList({
      gradingGroupId: gradingGroupId!,
    }),
    enabled: !!gradingGroupId,
  });


  const submissions = useMemo(() => {
    const studentSubmissions = new Map<number, Submission>();
    for (const sub of allSubmissionsData) {
      if (!sub.studentId) continue;
      const existing = studentSubmissions.get(sub.studentId);
      if (!existing) {
        studentSubmissions.set(sub.studentId, sub);
      } else {
        const existingDate = (existing.updatedAt || existing.submittedAt) ? new Date(existing.updatedAt || existing.submittedAt || 0).getTime() : 0;
        const currentDate = (sub.updatedAt || sub.submittedAt) ? new Date(sub.updatedAt || sub.submittedAt || 0).getTime() : 0;

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
    queries: gradingSessionsQueries.map((sessionQuery, index) => ({
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


  const submissionTotalScores = useMemo(() => {
    const scoreMap: Record<number, number> = {};
    submissions.forEach((submission, index) => {
      const sessionsQuery = gradingSessionsQueries[index];
      const gradeItemsQuery = gradeItemsQueries[index];

      if (sessionsQuery?.data?.items && sessionsQuery.data.items.length > 0) {
        const latestSession = sessionsQuery.data.items[0];


        if (gradeItemsQuery?.data?.items && gradeItemsQuery.data.items.length > 0) {
          const totalScore = gradeItemsQuery.data.items.reduce((sum, item) => sum + item.score, 0);
          scoreMap[submission.id] = totalScore;
        } else if (latestSession.grade !== undefined && latestSession.grade !== null) {

          scoreMap[submission.id] = latestSession.grade;
        }
      }
    });
    return scoreMap;
  }, [submissions, gradingSessionsQueries, gradeItemsQueries]);


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


  const { data: papersResponse } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(assessmentTemplate?.id!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplate!.id,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: !!assessmentTemplate?.id,
  });

  const papers = papersResponse?.items || [];


  const questionsQueries = useQueries({
    queries: papers.map((paper) => ({
      queryKey: queryKeys.assessmentQuestions.byPaperId(paper.id),
      queryFn: () => assessmentQuestionService.getAssessmentQuestions({
        assessmentPaperId: paper.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: papers.length > 0,
    })),
  });

  const allQuestions = useMemo(() => {
    const questions: any[] = [];
    questionsQueries.forEach((query) => {
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
    rubricsQueries.forEach((query) => {
      if (query.data?.items) {
        query.data.items.forEach((rubric: any) => {
          total += rubric.score || 0;
        });
      }
    });
    return total;
  }, [rubricsQueries]);


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


  const semesterCode = courseElement?.semesterCourse?.semester?.semesterCode;
  const { data: semesterDetail } = useQuery({
    queryKey: ['semesterPlanDetail', semesterCode],
    queryFn: () => semesterService.getSemesterPlanDetail(semesterCode!),
    enabled: !!semesterCode,
  });


  useEffect(() => {
    if (semesterDetail?.endDate) {
      const passed = isSemesterPassed(semesterDetail.endDate);
      setSemesterEnded(passed);
    } else {
      setSemesterEnded(false);
    }
  }, [semesterDetail?.endDate]);


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

  const handleOpenEditModal = useCallback((submission: Submission) => {
    setSelectedSubmissionForEdit(submission);
    setEditSubmissionModalVisible(true);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleUploadGradeSheet = useCallback(() => {
    if (!gradingGroup) return;
    if (isGradeSheetSubmitted) {
      message.warning("Grade sheet has already been submitted. You cannot submit again.");
      return;
    }
    setUploadFile(null);
    setUploadFileList([]);
    setUploadModalVisible(true);
  }, [gradingGroup, isGradeSheetSubmitted, message]);

  const handleUploadSubmit = useCallback(async () => {
    if (!gradingGroup || !uploadFile) {
      message.warning("Please select a file to upload");
      return;
    }

    if (isGradeSheetSubmitted) {
      message.warning("Grade sheet has already been submitted. You cannot submit again.");
      setUploadModalVisible(false);
      setUploadFile(null);
      setUploadFileList([]);
      return;
    }

    uploadGradeSheetMutation.mutate({
      gradingGroupId: gradingGroup.id,
      file: uploadFile,
    });
  }, [gradingGroup, uploadFile, uploadGradeSheetMutation, message, isGradeSheetSubmitted]);

  const handleExportGradeReport = useCallback(async () => {
    if (!gradingGroup) return;

    try {
      message.info("Preparing grade report...");
      await exportGradeReport(gradingGroup);
      message.success("Grade report exported successfully");
    } catch (err: any) {
      console.error("Export error:", err);
      message.error(err.message || "Export failed. Please check browser console for details.");
    }
  }, [gradingGroup, message]);

  const handleDownloadAllClick = useCallback(async () => {
    if (!gradingGroup) return;
    await handleDownloadAll(submissions, gradingGroup, message);
  }, [gradingGroup, submissions, message]);

  const handleDownloadSelectedClick = useCallback(async () => {
    if (!gradingGroup) return;
    await handleDownloadSelected(selectedSubmissions, gradingGroup, message);
  }, [gradingGroup, selectedSubmissions, message]);

  const handleSelectionChange = useCallback((selectedRowKeys: React.Key[], selectedRows: Submission[]) => {
    setSelectedSubmissions(selectedRows);
  }, []);

  const handleBatchGrading = useCallback(async () => {
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
        queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.all });
        queryClient.invalidateQueries({ queryKey: ['gradeItems'] });
              queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroupId', gradingGroupId] });
        queryClient.invalidateQueries({ queryKey: ['submissions'] });
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
      message.destroy();
      console.error("Failed to start batch grading:", err);
      setBatchGradingLoading(false);
      message.error(err.message || "Failed to start batch grading");
    }
  }, [gradingGroup, submissions, message, queryClient, gradingGroupId]);

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
          <GradingGroupHeader
            title={title}
            onBack={handleBack}
            onExportGradeReport={handleExportGradeReport}
            onUploadGradeSheet={handleUploadGradeSheet}
            onBatchGrading={handleBatchGrading}
            batchGradingLoading={batchGradingLoading}
            submissionsCount={submissions.length}
            semesterEnded={semesterEnded}
            isGradeSheetSubmitted={isGradeSheetSubmitted}
          />

          {!isGradeSheetSubmitted && (
            <Alert
              message="Important Notice"
              description="This grade sheet can only be submitted once. After submission, it cannot be edited or resubmitted. Please ensure all information is correct before submitting."
              type="warning"
              showIcon
              closable
            />
          )}

          {gradingGroup && (
            <Card title="Submitted Grade Sheet">
              {gradingGroup.submittedGradeSheetUrl ? (
                <Space direction="vertical" size="small">
                  <Typography.Text strong>Grade Sheet:</Typography.Text>
                  <Button
                    type="link"
                    icon={<DownloadOutlined />}
                    href={gradingGroup.submittedGradeSheetUrl}
                    target="_blank"
                    style={{ padding: 0 }}
                  >
                    Download Grade Sheet
                  </Button>
                  {gradingGroup.gradeSheetSubmittedAt && (
                    <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      Submitted at: {dayjs.utc(gradingGroup.gradeSheetSubmittedAt).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")}
                    </Typography.Text>
                  )}
                </Space>
              ) : (
                <Alert
                  message="No grade sheet submitted yet"
                  type="info"
                  showIcon
                />
              )}
            </Card>
          )}

          <Card
            title="Submissions"
            extra={
              <Space>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadSelectedClick}
                  disabled={selectedSubmissions.length === 0}
                >
                  Download Selected ({selectedSubmissions.length})
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadAllClick}
                  disabled={submissions.length === 0}
                >
                  Download All
                </Button>
              </Space>
            }
          >
            <SubmissionsTable
              submissions={submissions}
              submissionTotalScores={submissionTotalScores}
              maxScore={maxScore}
              onEdit={handleOpenEditModal}
              isGradeSheetSubmitted={isGradeSheetSubmitted}
              onSelectionChange={handleSelectionChange}
            />
          </Card>
        </Space>
      </Card>

      {selectedSubmissionForEdit && (
        <EditSubmissionModal
          visible={editSubmissionModalVisible}
          onClose={() => {
            setEditSubmissionModalVisible(false);
            setSelectedSubmissionForEdit(null);
          }}
          submission={selectedSubmissionForEdit}
          gradingGroup={gradingGroup}
          isGradeSheetSubmitted={isGradeSheetSubmitted}
        />
      )}

      <UploadGradeSheetModal
        visible={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setUploadFile(null);
          setUploadFileList([]);
        }}
        onOk={handleUploadSubmit}
        confirmLoading={uploadGradeSheetMutation.isPending}
        uploadFile={uploadFile}
        uploadFileList={uploadFileList}
        onFileChange={(file, fileList) => {
          setUploadFile(file);
          setUploadFileList(fileList);
        }}
      />
    </div>
  );
}
