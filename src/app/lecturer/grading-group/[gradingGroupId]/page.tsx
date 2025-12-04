"use client";

import { Alert, App, Button, Card, Space, Spin, Typography } from "antd";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
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
      await exportGradeReport(gradingGroup);
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
            title={gradingGroup.assessmentTemplateName || "Grading Group"}
            onBack={() => router.back()}
            onExportGradeReport={handleExportGradeReport}
            onUploadGradeSheet={handleUploadGradeSheet}
            onBatchGrading={handleBatchGrading}
            batchGradingLoading={batchGradingLoading}
            submissionsCount={submissions.length}
            semesterEnded={semesterEnded}
          />

          <Card>
            <SubmissionsTable
              submissions={submissions}
              submissionTotalScores={submissionTotalScores}
              onEdit={handleOpenEditModal}
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
