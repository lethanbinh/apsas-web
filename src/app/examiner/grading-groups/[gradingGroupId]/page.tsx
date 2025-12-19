"use client";

import { Alert, App, Button, Card, Popconfirm, Space, Spin, Typography } from "antd";
import { ArrowLeftOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { gradingGroupService, GradingGroup } from "@/services/gradingGroupService";
import { Submission, submissionService } from "@/services/submissionService";
import { SubmissionsTable } from "@/app/lecturer/grading-group/[gradingGroupId]/components/SubmissionsTable";
import { gradingService } from "@/services/gradingService";
import { gradeItemService } from "@/services/gradeItemService";
import { AssignSubmissionsModal } from "@/components/examiner/AssignSubmissionsModal";

const { Title, Text } = Typography;

export default function ExaminerGradingGroupPage() {
  const router = useRouter();
  const params = useParams();
  const gradingGroupId = params?.gradingGroupId ? Number(params.gradingGroupId) : null;
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Submission[]>([]);

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
  }, [gradingGroup, gradingGroupId, isLoadingGradingGroups, message, router]);

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

  const handleBack = () => {
    router.back();
  };

  const handleSelectionChange = (selectedRowKeys: React.Key[], selectedRows: Submission[]) => {
    setSelectedRowKeys(selectedRowKeys);
    setSelectedSubmissions(selectedRows);
  };

  const handleOpenAssignModal = () => {
    setIsAssignModalOpen(true);
  };

  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false);
  };

  const handleAssignModalOk = () => {
    setIsAssignModalOpen(false);
    // Invalidate queries to refresh submissions
    queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroupId', gradingGroupId] });
    queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all });
  };

  const handleDeleteSubmission = async (submission: Submission) => {
    try {
      await submissionService.deleteSubmission(submission.id);
      message.success(`Submission deleted successfully!`);
      // Invalidate queries to refresh submissions
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroupId', gradingGroupId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all });
      setSelectedRowKeys([]);
      setSelectedSubmissions([]);
    } catch (err: any) {
      console.error("Failed to delete submission:", err);
      const errorMsg = err.response?.data?.errorMessages?.[0] || err.message || "Failed to delete submission.";
      message.error(errorMsg);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSubmissions.length === 0) {
      message.warning("Please select at least one submission to delete");
      return;
    }

    try {
      await Promise.all(
        selectedSubmissions.map(submission => submissionService.deleteSubmission(submission.id))
      );
      message.success(`Deleted ${selectedSubmissions.length} submission(s) successfully!`);
      // Invalidate queries to refresh submissions
      queryClient.invalidateQueries({ queryKey: ['submissions', 'byGradingGroupId', gradingGroupId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.groups.all });
      setSelectedRowKeys([]);
      setSelectedSubmissions([]);
    } catch (err: any) {
      console.error("Failed to delete submissions:", err);
      const errorMsg = err.response?.data?.errorMessages?.[0] || err.message || "Failed to delete submissions.";
      message.error(errorMsg);
    }
  };

  const loading = isLoadingGradingGroups && !gradingGroup;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
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
    <div style={{ padding: '30px 40px', backgroundColor: '#f0f7ff', minHeight: '100vh' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                Back
              </Button>
              <Title level={2} style={{ margin: 0, fontWeight: 700, color: "#2F327D" }}>
                {title}
              </Title>
            </Space>
            {gradingGroup && (
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={handleOpenAssignModal}
              >
                Upload Submissions
              </Button>
            )}
          </div>

          {gradingGroup && (
            <Card title="Submitted Grade Sheet">
              {gradingGroup.submittedGradeSheetUrl ? (
                <Space direction="vertical" size="small">
                  <Text strong>Grade Sheet:</Text>
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
                    <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                      Submitted at: {dayjs.utc(gradingGroup.gradeSheetSubmittedAt).tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm")}
                    </Text>
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
              selectedSubmissions.length > 0 && (
                <Popconfirm
                  title={`Delete ${selectedSubmissions.length} submission(s)`}
                  description="Are you sure you want to delete these submissions?"
                  onConfirm={handleDeleteSelected}
                  okText="Delete"
                  cancelText="Cancel"
                  okType="danger"
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={selectedSubmissions.length === 0}
                  >
                    Delete Selected ({selectedSubmissions.length})
                  </Button>
                </Popconfirm>
              )
            }
          >
            <SubmissionsTable
              submissions={submissions}
              submissionTotalScores={submissionTotalScores}
              maxScore={0}
              onDelete={handleDeleteSubmission}
              isGradeSheetSubmitted={isGradeSheetSubmitted}
              onSelectionChange={handleSelectionChange}
              selectedRowKeys={selectedRowKeys}
            />
          </Card>
        </Space>
      </Card>

      {gradingGroup && gradingGroupsData && (
        <AssignSubmissionsModal
          open={isAssignModalOpen}
          onCancel={handleCloseAssignModal}
          onOk={handleAssignModalOk}
          group={gradingGroup}
          allGroups={gradingGroupsData}
        />
      )}
    </div>
  );
}

