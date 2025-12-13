"use client";

import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { courseElementService } from "@/services/courseElementService";
import { FeedbackData, geminiService } from "@/services/geminiService";
import { gradingService, GradingSession } from "@/services/gradingService";
import { gradeItemService, GradeItem } from "@/services/gradeItemService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission, submissionService } from "@/services/submissionService";
import { gradingGroupService, GradingGroup } from "@/services/gradingGroupService";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { Alert, App, Button, Card, Col, Collapse, Descriptions, Input, InputNumber, Modal, Row, Space, Spin, Table, Tag, Typography, Divider } from "antd";
import { HistoryOutlined, RobotOutlined, SaveOutlined } from "@ant-design/icons";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { GradingHistoryModal } from "./GradingHistoryModal";
import { SubmissionHeaderCard } from "./SubmissionHeaderCard";
import { QuestionsGradingSection } from "./QuestionsGradingSection";
import { FeedbackSection } from "./FeedbackSection";
import { GradingDetailsSection } from "./GradingDetailsSection";
import { useAutoGrading } from "./hooks/useAutoGrading";
import { useFeedbackOperations } from "./hooks/useFeedbackOperations";
import { useSubmissionData } from "./hooks/useSubmissionData";
import { semesterService } from "@/services/semesterService";
import { isSemesterPassed } from "../utils/dateUtils";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;
const { TextArea } = Input;

const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

export interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
}

interface EditSubmissionModalProps {
  visible: boolean;
  onClose: () => void;
  submission: Submission;
  gradingGroup: GradingGroup;
  isGradeSheetSubmitted: boolean;
}

export function EditSubmissionModal({
  visible,
  onClose,
  submission,
  gradingGroup,
  isGradeSheetSubmitted,
}: EditSubmissionModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [semesterEnded, setSemesterEnded] = useState(false);
  const [gradingHistoryModalVisible, setGradingHistoryModalVisible] = useState(false);
  const [userEdits, setUserEdits] = useState<{
    rubricScores: Record<string, number>;
    rubricComments: Record<number, string>;
  }>({
    rubricScores: {},
    rubricComments: {},
  });

  // Use custom hooks for data fetching and operations
  const {
    questions,
    latestGradingSession,
    latestGradeItems,
    totalScore,
    maxScore,
    loading: dataLoading,
  } = useSubmissionData({
    visible,
    submission,
    gradingGroup,
    userEdits,
    setUserEdits,
    setTotalScore: () => {},
  });

  const {
    feedback,
    loadingFeedback,
    loadingAiFeedback,
    submissionFeedbackId,
    setFeedback,
    handleGetAiFeedback,
    handleSaveFeedback,
  } = useFeedbackOperations({
    visible,
    submission,
    setSubmissionFeedbackId: () => {},
  });

  const { autoGradingLoading, handleAutoGrading } = useAutoGrading({
    submission,
    gradingGroup,
    semesterEnded,
    isGradeSheetSubmitted,
    message,
    queryClient,
  });

  // Fetch assessment template to get course element and semester info
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

  // Fetch course element to get semester info
  const { data: courseElementsData } = useQuery({
    queryKey: queryKeys.courseElements.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: visible && !!assessmentTemplate?.courseElementId,
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
    enabled: visible && !!semesterCode,
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

  const updateRubricScore = useCallback((questionId: number, rubricId: number, score: number) => {
    const editKey = `${questionId}_${rubricId}`;
    setUserEdits((prev) => ({
      ...prev,
      rubricScores: {
        ...prev.rubricScores,
        [editKey]: score,
      },
    }));
  }, []);

  const updateQuestionComment = useCallback((questionId: number, comment: string) => {
    setUserEdits((prev) => ({
      ...prev,
      rubricComments: {
        ...prev.rubricComments,
        [questionId]: comment,
      },
    }));
  }, []);

  const handleSave = async () => {
    if (!submission || !user?.id) {
      message.error("Submission or User ID not found");
      return;
    }

    if (semesterEnded) {
      message.warning("Cannot save grade when the semester has ended");
      return;
    }

    if (isGradeSheetSubmitted) {
      message.warning("Cannot save grade when the grade sheet has been submitted");
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

  const modalTitle = useMemo(() => {
    return `Edit Submission - ${submission.studentCode} - ${submission.studentName}`;
  }, [submission.studentCode, submission.studentName]);

  const handleFeedbackChange = useCallback((field: keyof FeedbackData, value: string) => {
    setFeedback((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleOpenGradingHistory = useCallback(() => {
    setGradingHistoryModalVisible(true);
  }, []);

  const handleCloseGradingHistory = useCallback(() => {
    setGradingHistoryModalVisible(false);
  }, []);

  return (
    <Modal
      title={
        <div>
          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {modalTitle}
          </h4>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1400}
      style={{ top: 20 }}
    >
      <Space direction="vertical" size="large" style={{ width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
        {semesterEnded && (
          <Alert
            message="Semester has ended. Grading modifications are disabled."
            type="warning"
            showIcon
          />
        )}
        {isGradeSheetSubmitted && (
          <Alert
            message="Grade sheet has been submitted. Grading modifications are disabled."
            type="warning"
            showIcon
          />
        )}

        <SubmissionHeaderCard
          submission={submission}
          totalScore={totalScore}
          maxScore={maxScore}
        />

        <GradingDetailsSection
          questions={questions}
          latestGradingSession={latestGradingSession}
          maxScore={maxScore}
          semesterEnded={semesterEnded}
          isGradeSheetSubmitted={isGradeSheetSubmitted}
          autoGradingLoading={autoGradingLoading}
          saving={saving}
          onAutoGrading={handleAutoGrading}
          onSave={handleSave}
          onOpenGradingHistory={handleOpenGradingHistory}
          updateRubricScore={updateRubricScore}
          updateQuestionComment={updateQuestionComment}
          message={message}
        />

        <FeedbackSection
          feedback={feedback}
          loading={loadingFeedback}
          loadingAiFeedback={loadingAiFeedback}
          onFeedbackChange={handleFeedbackChange}
          onSaveFeedback={handleSaveFeedback}
          onGetAiFeedback={handleGetAiFeedback}
        />
      </Space>

      {submission && (
        <GradingHistoryModal
          visible={gradingHistoryModalVisible}
          onClose={handleCloseGradingHistory}
          submissionId={submission.id}
        />
      )}
    </Modal>
  );
}

