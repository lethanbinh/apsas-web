"use client";

import { useStudent } from "@/hooks/useStudent";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { courseElementService } from "@/services/courseElementService";
import { FeedbackData, geminiService } from "@/services/geminiService";
import { gradeItemService } from "@/services/gradeItemService";
import { gradingService, GradeItem as GradingServiceGradeItem, GradingSession } from "@/services/gradingService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission, submissionService } from "@/services/submissionService";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { CloseOutlined, DownloadOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Checkbox, Col, Collapse, Descriptions, Divider, Input, Modal, Row, Space, Spin, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import styles from "./ScoreFeedbackModal.module.css";
import { AssignmentData } from "./data";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
  questionComment?: string;
}

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

interface ScoreFeedbackModalProps {
  open: boolean;
  onCancel: () => void;
  data: AssignmentData;
}

export const ScoreFeedbackModal: React.FC<ScoreFeedbackModalProps> = ({
  open,
  onCancel,
  data,
}) => {
  const { studentId } = useStudent();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // Initialize with empty feedback data (will be populated from API)
  const defaultEmptyFeedback: FeedbackData = {
    overallFeedback: "",
    strengths: "",
    weaknesses: "",
    codeQuality: "",
    algorithmEfficiency: "",
    suggestionsForImprovement: "",
    bestPractices: "",
    errorHandling: "",
  };

  // Fetch submissions
  const { data: submissionsData = [], isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['submissions', 'byStudentAndClassAssessment', studentId, data.classAssessmentId],
    queryFn: () => submissionService.getSubmissionList({
      studentId: studentId!,
      classAssessmentId: data.classAssessmentId ?? undefined,
    }),
    enabled: open && !!studentId && !!data.classAssessmentId,
  });

  // Get latest submission
  const lastSubmission = useMemo(() => {
    if (!submissionsData || submissionsData.length === 0) return null;
    const sorted = [...submissionsData].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return sorted[0];
  }, [submissionsData]);

  // Fetch latest grading session
  const { data: gradingSessionsData, isLoading: isLoadingGradingSessions } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId: lastSubmission?.id!, pageNumber: 1, pageSize: 1 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: lastSubmission!.id,
      pageNumber: 1,
      pageSize: 1, // Only fetch latest
    }),
    enabled: open && !!lastSubmission?.id,
  });

  const latestGradingSession = useMemo(() => {
    if (!gradingSessionsData?.items || gradingSessionsData.items.length === 0) return null;
    return gradingSessionsData.items[0]; // Already sorted by API (latest first)
  }, [gradingSessionsData]);

  // Fetch grade items for latest session
  const { data: gradeItemsData, isLoading: isLoadingGradeItems } = useQuery({
    queryKey: ['gradeItems', 'byGradingSessionId', latestGradingSession?.id],
    queryFn: async () => {
      if (!latestGradingSession) return { items: [] };

      // Check if gradeItems are already in the session response
      if (latestGradingSession.gradeItems && latestGradingSession.gradeItems.length > 0) {
        return { items: latestGradingSession.gradeItems };
      }
      
      // Fallback: fetch grade items separately
      const gradeItemsResult = await gradeItemService.getGradeItems({
        gradingSessionId: latestGradingSession.id,
        pageNumber: 1,
        pageSize: 1000,
      });
      
      // Convert to GradingServiceGradeItem format
          return {
        items: gradeItemsResult.items.map((item) => ({
          id: item.id,
          score: item.score,
          comments: item.comments,
          rubricItemId: item.rubricItemId,
          rubricItemDescription: item.rubricItemDescription,
          rubricItemMaxScore: item.rubricItemMaxScore,
        })),
      };
    },
    enabled: open && !!latestGradingSession?.id,
  });

  // Get latest grade items (deduplicated by rubricItemId)
  const latestGradeItems = useMemo(() => {
    if (!gradeItemsData?.items || gradeItemsData.items.length === 0) return [];
    const latestGradeItemsMap = new Map<number, GradingServiceGradeItem>();
    gradeItemsData.items.forEach((item) => {
      const rubricId = item.rubricItemId;
      if (!latestGradeItemsMap.has(rubricId)) {
        latestGradeItemsMap.set(rubricId, item);
      }
    });
    return Array.from(latestGradeItemsMap.values());
  }, [gradeItemsData]);

  // Calculate total score
  const totalScore = useMemo(() => {
    if (latestGradeItems.length > 0) {
      return latestGradeItems.reduce((sum, item) => sum + item.score, 0);
    }
    if (latestGradingSession?.grade !== undefined && latestGradingSession.grade !== null) {
      return latestGradingSession.grade;
      }
    return 0;
  }, [latestGradeItems, latestGradingSession]);

  /**
   * Deserialize JSON string to feedback data
   * Returns null if feedback is not JSON format
   */
  const deserializeFeedback = (feedbackText: string): FeedbackData | null => {
    if (!feedbackText || feedbackText.trim() === "") {
      return null;
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
      return null;
    } catch (error) {
      return null;
    }
  };

  // Fetch feedback
  const { data: feedbackList = [], isLoading: isLoadingFeedback } = useQuery({
    queryKey: ['submissionFeedback', 'bySubmissionId', lastSubmission?.id],
    queryFn: async () => {
      if (!lastSubmission?.id) return [];
      const feedbackList = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: lastSubmission.id,
      });
      return feedbackList;
    },
    enabled: open && !!lastSubmission?.id,
  });

  // Get raw feedback text
  const rawFeedbackText = useMemo(() => {
    if (!feedbackList || feedbackList.length === 0) return null;
    return feedbackList[0].feedbackText;
  }, [feedbackList]);

  // Check if feedback is already in JSON format
  const isFeedbackJson = useMemo(() => {
    if (!rawFeedbackText) return false;
    const parsed = deserializeFeedback(rawFeedbackText);
    return parsed !== null;
  }, [rawFeedbackText]);

  // Format feedback with Gemini API if it's not JSON
  const { data: formattedFeedback, isLoading: isLoadingFormattedFeedback } = useQuery({
    queryKey: ['formattedFeedback', 'gemini', rawFeedbackText],
    queryFn: async () => {
      if (!rawFeedbackText) return null;
      // Check if it's already JSON format
      const parsed = deserializeFeedback(rawFeedbackText);
      if (parsed !== null) return null; // Already JSON, don't format
      // Format with Gemini
      return await geminiService.formatFeedback(rawFeedbackText);
    },
    enabled: open && !!rawFeedbackText && !isFeedbackJson,
    staleTime: Infinity, // Cache forever since feedback doesn't change
  });

  // Process feedback - combine parsed JSON or Gemini formatted feedback
  const feedback = useMemo(() => {
    if (!feedbackList || feedbackList.length === 0) return defaultEmptyFeedback;
    
    const existingFeedback = feedbackList[0];
        let parsedFeedback: FeedbackData | null = deserializeFeedback(existingFeedback.feedbackText);
        
    // If deserialize returns null, use Gemini formatted feedback if available
        if (parsedFeedback === null) {
      if (formattedFeedback) {
        parsedFeedback = formattedFeedback;
      } else {
        // Fallback: put entire text into overallFeedback while loading
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
        
    return parsedFeedback || defaultEmptyFeedback;
  }, [feedbackList, formattedFeedback]);

  // Determine assessmentTemplateId (similar to RequirementModal)
  const effectiveClassId = useMemo(() => {
    if (data.classId) return data.classId;
    const stored = localStorage.getItem("selectedClassId");
    return stored ? Number(stored) : null;
  }, [data.classId]);

  // Fetch class assessments to find assessmentTemplateId
  const { data: classAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(effectiveClassId?.toString()!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: effectiveClassId!,
              pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: open && !!effectiveClassId && (!!data.classAssessmentId || !!data.courseElementId),
  });

  // Determine assessmentTemplateId
  const assessmentTemplateId = useMemo(() => {
      if (data.assessmentTemplateId) {
      return data.assessmentTemplateId;
      }

    if (data.classAssessmentId && classAssessmentsData?.items) {
      const classAssessment = classAssessmentsData.items.find(ca => ca.id === data.classAssessmentId);
        if (classAssessment?.assessmentTemplateId) {
        return classAssessment.assessmentTemplateId;
          }
    }
    
    if (data.courseElementId && classAssessmentsData?.items) {
      const classAssessment = classAssessmentsData.items.find(ca => ca.courseElementId === data.courseElementId);
            if (classAssessment?.assessmentTemplateId) {
        return classAssessment.assessmentTemplateId;
      }
    }
    
    return null;
  }, [data.assessmentTemplateId, data.classAssessmentId, data.courseElementId, classAssessmentsData]);

  // Fetch assign requests to filter approved templates
  const { data: assignRequestsData } = useQuery({
    queryKey: queryKeys.assignRequests.all,
    queryFn: () => assignRequestService.getAssignRequests({
              pageNumber: 1,
              pageSize: 1000,
    }),
    enabled: open && !!assessmentTemplateId,
  });

  const approvedAssignRequestIds = useMemo(() => {
    if (!assignRequestsData?.items) return new Set<number>();
    const approved = assignRequestsData.items.filter(ar => ar.status === 5);
    return new Set(approved.map(ar => ar.id));
  }, [assignRequestsData]);

  // Fetch assessment templates
  const { data: templatesData } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
          pageNumber: 1,
          pageSize: 1000,
    }),
    enabled: open && !!assessmentTemplateId,
  });

  // Find approved template
  const template = useMemo(() => {
    if (!templatesData?.items || !assessmentTemplateId) return null;
    return templatesData.items.find((t) => {
      if (t.id !== assessmentTemplateId) return false;
      if (!t.assignRequestId) return false;
        return approvedAssignRequestIds.has(t.assignRequestId);
      });
  }, [templatesData, assessmentTemplateId, approvedAssignRequestIds]);

      // Fetch papers
  const { data: papersData } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(assessmentTemplateId!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplateId!,
        pageNumber: 1,
        pageSize: 100,
    }),
    enabled: open && !!assessmentTemplateId && !!template,
  });

  // Fetch questions for each paper
  const questionsQueries = useQueries({
    queries: (papersData?.items || []).map((paper) => ({
      queryKey: queryKeys.assessmentQuestions.byPaperId(paper.id),
      queryFn: () => assessmentQuestionService.getAssessmentQuestions({
          assessmentPaperId: paper.id,
          pageNumber: 1,
          pageSize: 100,
      }),
      enabled: open && !!template,
    })),
  });

  // Fetch rubrics for each question
  const allQuestionIds = useMemo(() => {
    const ids: number[] = [];
    questionsQueries.forEach((query) => {
      if (query.data?.items) {
        query.data.items.forEach((q) => ids.push(q.id));
      }
    });
    return ids;
  }, [questionsQueries]);

  const rubricsQueries = useQueries({
    queries: allQuestionIds.map((questionId) => ({
      queryKey: queryKeys.rubricItems.byQuestionId(questionId),
      queryFn: () => rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: questionId,
            pageNumber: 1,
            pageSize: 100,
      }),
      enabled: open && !!template && allQuestionIds.length > 0,
    })),
  });

  // Build questions with rubrics and map grade items
  const questions = useMemo(() => {
    if (!papersData?.items || !template) return [];
    
    const allQuestions: QuestionWithRubrics[] = [];
    let questionIndex = 0;

    papersData.items.forEach((paper, paperIndex) => {
      const paperQuestionsQuery = questionsQueries[paperIndex];
      if (!paperQuestionsQuery?.data?.items) return;

      const paperQuestions = [...paperQuestionsQuery.data.items].sort(
        (a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)
      );

      paperQuestions.forEach((question) => {
        // Find rubrics for this question
        const rubricQuery = rubricsQueries[questionIndex];
        const questionRubrics = rubricQuery?.data?.items || [];

        // Initialize rubric scores and comments
          const rubricScores: { [rubricId: number]: number } = {};
              const rubricComments: { [rubricId: number]: string } = {};
              let questionComment = "";

          questionRubrics.forEach((rubric) => {
                rubricScores[rubric.id] = 0;
                rubricComments[rubric.id] = "";

          // Map grade items to rubrics
          const matchingGradeItem = latestGradeItems.find(
            (item) => item.rubricItemId === rubric.id
          );
          if (matchingGradeItem) {
            rubricScores[rubric.id] = matchingGradeItem.score;
            rubricComments[rubric.id] = matchingGradeItem.comments || "";
            if (!questionComment && matchingGradeItem.comments) {
              questionComment = matchingGradeItem.comments;
            }
          }
          });

          allQuestions.push({
            ...question,
            rubrics: questionRubrics,
            rubricScores,
                rubricComments,
                questionComment,
              });

        questionIndex++;
      });
    });

    return allQuestions.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
  }, [papersData, template, questionsQueries, rubricsQueries, latestGradeItems]);

  // Calculate loading state (after all queries are declared) - exclude formatted feedback loading
  const loading = useMemo(() => {
    return (
      isLoadingSubmissions ||
      isLoadingGradingSessions ||
      isLoadingGradeItems ||
      isLoadingFeedback ||
      questionsQueries.some(q => q.isLoading) ||
      rubricsQueries.some(q => q.isLoading)
    );
  }, [isLoadingSubmissions, isLoadingGradingSessions, isLoadingGradeItems, isLoadingFeedback, questionsQueries, rubricsQueries]);

  // Separate loading state for feedback formatting
  const isLoadingFeedbackFormatting = isLoadingFormattedFeedback;

  // Check if score is available
  const hasScore = () => {
    // Check if we have a completed grading session (even with score = 0, it means graded)
    if (latestGradingSession && latestGradingSession.status === 1) {
      return true;
    }
    // Check if we have totalScore (including 0, which means graded but got 0)
    if (totalScore !== undefined && totalScore !== null) {
      return true;
    }
    // Check if we have grade items (even with score = 0, it means graded)
    if (latestGradeItems.length > 0) {
      return true;
    }
    // Check if lastSubmission has grade (including 0)
    if (lastSubmission?.lastGrade !== undefined && lastSubmission?.lastGrade !== null) {
      return true;
    }
    // Check if we have questions with rubric scores (even if 0, means grading was done)
    if (questions.length > 0 && questions.some(q => {
      const scores = Object.values(q.rubricScores || {});
      return scores.length > 0;
    })) {
      return true;
    }
    return false;
  };

  // Check if feedback is available
  const hasFeedback = () => {
    // Check overallFeedback
    if (feedback?.overallFeedback && feedback.overallFeedback.trim() !== "") {
      return true;
    }
    // Check detailed feedback sections
    if (feedback?.strengths || feedback?.weaknesses || feedback?.codeQuality ||
      feedback?.algorithmEfficiency || feedback?.suggestionsForImprovement ||
      feedback?.bestPractices || feedback?.errorHandling) {
      return true;
    }
    // Check old format feedback
    if (data.overallFeedback || data.suggestionsAvoid || data.suggestionsImprove) {
      return true;
    }
    // Check if there are comments in grade items
    if (latestGradeItems.length > 0 && latestGradeItems.some(item => item.comments && item.comments.trim() !== "")) {
      return true;
    }
    return false;
  };

  // Calculate max score from all rubrics (not from question.score)
  const maxScore = useMemo(() => {
    return questions.reduce((sum, q) => {
      return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
    }, 0);
  }, [questions]);

  // Calculate total score from questions or use latest grading session
  const getTotalScoreDisplay = () => {
    // If we have a grading session, use totalScore (even if it's 0)
    if (latestGradingSession && latestGradingSession.status === 1) {
      if (maxScore > 0) {
        return `${Number(totalScore).toFixed(2)}/${Number(maxScore).toFixed(2)}`;
      }
      // If no questions or maxScore is 0, just return the score (even if 0)
      return Number(totalScore).toFixed(2);
    }

    // If we have totalScore from state, show it (even if 0 means graded but got 0)
    if (totalScore !== undefined && totalScore !== null) {
      if (maxScore > 0) {
        return `${Number(totalScore).toFixed(2)}/${Number(maxScore).toFixed(2)}`;
      }
      return Number(totalScore).toFixed(2);
    }

    // Fallback to lastSubmission.lastGrade if available
    if (lastSubmission?.lastGrade !== undefined && lastSubmission?.lastGrade !== null) {
      if (maxScore > 0) {
        return `${Number(lastSubmission.lastGrade).toFixed(2)}/${Number(maxScore).toFixed(2)}`;
      }
      return Number(lastSubmission.lastGrade).toFixed(2);
    }

    // If we have grade items, calculate total from them
    if (latestGradeItems.length > 0) {
      const calculatedTotal = latestGradeItems.reduce((sum, item) => sum + item.score, 0);
      if (maxScore > 0) {
        return `${Number(calculatedTotal).toFixed(2)}/${Number(maxScore).toFixed(2)}`;
      }
      return Number(calculatedTotal).toFixed(2);
    }

    // If we have questions with rubric scores, calculate total
    if (questions.length > 0) {
      const calculatedTotal = questions.reduce((sum, q) => {
        const questionTotal = Object.values(q.rubricScores || {}).reduce((s, score) => s + (score || 0), 0);
        return sum + questionTotal;
      }, 0);
      if (maxScore > 0 && calculatedTotal > 0) {
        return `${Number(calculatedTotal).toFixed(2)}/${Number(maxScore).toFixed(2)}`;
      }
      if (calculatedTotal > 0) {
        return Number(calculatedTotal).toFixed(2);
      }
    }

    // If no score available, return null to show message
    return null;
  };

  const getQuestionColumns = (question: QuestionWithRubrics): ColumnsType<RubricItem> => [
    {
      title: "Criteria",
      dataIndex: "description",
      key: "description",
      width: 200,
      fixed: "left" as const,
      render: (text: string) => (
        <Tooltip title={text} placement="topLeft">
          <Text strong style={{ fontSize: "13px" }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Input",
      dataIndex: "input",
      key: "input",
      width: 120,
      render: (text: string) => {
        const displayText = text && text !== "N/A" ? text : "N/A";
        return (
          <Tooltip title={displayText} placement="top">
            <Text
              code
              style={{
                fontSize: "11px",
                display: "block",
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {displayText}
        </Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Output",
      dataIndex: "output",
      key: "output",
      width: 120,
      render: (text: string) => {
        const displayText = text && text !== "N/A" ? text : "N/A";
        return (
          <Tooltip title={displayText} placement="top">
            <Text
              code
              style={{
                fontSize: "11px",
                display: "block",
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {displayText}
        </Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Max Score",
      dataIndex: "score",
      key: "maxScore",
      width: 100,
      align: "center",
      render: (score: number) => (
        <Tag color="blue" style={{ margin: 0 }}>
          {score}
        </Tag>
      ),
    },
    {
      title: "Score",
      key: "rubricScore",
      width: 80,
      align: "center",
      render: (_: any, record: RubricItem) => {
        const currentScore = question.rubricScores[record.id] || 0;
        const maxScore = record.score;
        const scorePercentage = maxScore > 0 ? (currentScore / maxScore) * 100 : 0;
        const tagColor = scorePercentage >= 80 ? "green" : scorePercentage >= 50 ? "orange" : "red";
        return (
          <Tag color={tagColor} style={{ margin: 0, fontWeight: "bold" }}>
            {currentScore}
          </Tag>
        );
      },
    },
    {
      title: "Comments",
      key: "rubricComments",
      width: 400,
      render: (_: any, record: RubricItem) => {
        const comment = question.rubricComments?.[record.id] || "";
        if (!comment || comment === "-") {
          return <Text type="secondary" style={{ fontSize: "12px" }}>-</Text>;
        }

        // Truncate long comments for display
        const maxLength = 150;
        const isLong = comment.length > maxLength;
        const displayText = isLong ? comment.substring(0, maxLength) + "..." : comment;

        return (
          <Tooltip title={comment} placement="topLeft" overlayStyle={{ maxWidth: "500px" }}>
            <div style={{
              fontSize: "12px",
              lineHeight: "1.5",
              wordBreak: "break-word",
              maxHeight: "100px",
              overflowY: "auto",
              padding: "4px 0"
            }}>
              <Text style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                {displayText}
          </Text>
            </div>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <Title level={3} style={{ margin: 0 }}>
          Assignment Score & Feedback
        </Title>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1200}
      style={{ top: 20 }}
      closeIcon={<CloseOutlined />}
    >
      <Spin spinning={loading}>
        <div className={styles.container}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* Submission Information Card */}
            <Card className={styles.headerCard}>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Assignment">{data.title}</Descriptions.Item>
                <Descriptions.Item label="Status">{data.status}</Descriptions.Item>
                {lastSubmission && (
                  <>
                    <Descriptions.Item label="Submission ID">{lastSubmission.id}</Descriptions.Item>
                    <Descriptions.Item label="Submitted At">
                      {lastSubmission.submittedAt
                        ? toVietnamTime(lastSubmission.submittedAt).format("DD MMM YYYY, HH:mm")
                        : "N/A"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Submission File">
                      {lastSubmission.submissionFile?.name || "N/A"}
                    </Descriptions.Item>
                  </>
                )}
                <Descriptions.Item label="Total Score">
                  {getTotalScoreDisplay() !== null ? (
                  <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
                      {getTotalScoreDisplay()}
                  </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: "14px" }}>
                      No score available
                    </Text>
                  )}
                </Descriptions.Item>
                {latestGradingSession && (
                  <>
                    <Descriptions.Item label="Grading Status">
                      <Tag color={
                        latestGradingSession.status === 1 ? "green" :
                          latestGradingSession.status === 2 ? "red" :
                            "orange"
                      }>
                        {latestGradingSession.status === 1 ? "Completed" :
                          latestGradingSession.status === 2 ? "Failed" :
                            "Processing"}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Grading Type">
                      <Tag color={
                        latestGradingSession.gradingType === 0 ? "blue" :
                          latestGradingSession.gradingType === 1 ? "purple" :
                            "cyan"
                      }>
                        {latestGradingSession.gradingType === 0 ? "AI" :
                          latestGradingSession.gradingType === 1 ? "Lecturer" :
                            "Both"}
                      </Tag>
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </Card>

            {/* Grading Details Card - Questions and Rubrics */}
            {questions.length > 0 && hasScore() && (
              <Card className={styles.questionsCard}>
                <Title level={3}>Grading Details</Title>
                <Text type="secondary">
                  Total Questions: {questions.length} | Total Max Score:{" "}
                  {maxScore.toFixed(2)}
                </Text>
                <Divider />

                <Collapse 
                  defaultActiveKey={questions.map((_, i) => i.toString())}
                  items={[...questions].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((question, index) => {
                    const questionTotalScore = Object.values(question.rubricScores).reduce(
                      (sum, score) => sum + (score || 0),
                      0
                    );
                    const questionMaxScore = question.rubrics.reduce(
                      (sum, r) => sum + r.score,
                      0
                    );

                    return {
                      key: index.toString(),
                      label: (
                        <div className={styles.questionHeader}>
                          <span>
                            <strong>Question {index + 1}:</strong> {question.questionText}
                          </span>
                          <Space>
                            <Tag color="blue">
                              Score: {questionTotalScore.toFixed(2)}/{questionMaxScore.toFixed(2)}
                            </Tag>
                            <Tag color="green">Max: {questionMaxScore.toFixed(2)}</Tag>
                          </Space>
                        </div>
                      ),
                      children: (
                        <div className={styles.questionContent}>
                          {question.questionSampleInput && (
                            <div className={styles.sampleSection}>
                              <Text strong>Sample Input:</Text>
                              <pre className={styles.codeBlock}>
                                {question.questionSampleInput}
                              </pre>
                            </div>
                          )}
                          {question.questionSampleOutput && (
                            <div className={styles.sampleSection}>
                              <Text strong>Sample Output:</Text>
                              <pre className={styles.codeBlock}>
                                {question.questionSampleOutput}
                              </pre>
                            </div>
                          )}

                          <Divider />

                          <Title level={5} style={{ marginBottom: 12 }}>
                            Grading Criteria ({question.rubrics.length})
                          </Title>
                          <div style={{ overflowX: "auto" }}>
                          <Table
                            columns={getQuestionColumns(question)}
                            dataSource={question.rubrics}
                            rowKey="id"
                            pagination={false}
                            size="small"
                              scroll={{ x: 1000 }}
                              className={styles.gradingTable}
                          />
                          </div>
                        </div>
                      ),
                    };
                  })}
                />
              </Card>
            )}

            {/* Fallback to old Grade Criteria Card if no questions */}
            {questions.length === 0 && data.gradeCriteria && data.gradeCriteria.length > 0 && (
              <Card className={styles.questionsCard}>
                <Title level={3}>Grading Details</Title>
                <Text type="secondary">
                  Total Criteria: {data.gradeCriteria.length} | Total Score: {data.totalScore}
                </Text>
                <Divider />

                <Collapse
                  defaultActiveKey={data.gradeCriteria.map((_, i) => i.toString())}
                  items={data.gradeCriteria.map((criterion, index) => {
                    return {
                      key: index.toString(),
                      label: (
                        <div className={styles.questionHeader}>
                          <span>
                            <strong>Criteria {index + 1}:</strong> {criterion.name}
                          </span>
                          <Space>
                            <Tag color="blue">
                              Score: {criterion.score}
                            </Tag>
                          </Space>
                        </div>
                      ),
                      children: (
                        <div className={styles.questionContent}>
                          <Title level={5}>Reason for this score</Title>
                          <TextArea
                            rows={6}
                            value={criterion.reason || "No reason provided."}
                            readOnly
                            style={{ marginTop: 8 }}
                          />
                        </div>
                      ),
                    };
                  })}
                />
              </Card>
            )}

            <Card className={styles.feedbackCard}>
              <Spin spinning={isLoadingFeedback || isLoadingFeedbackFormatting}>
              <Title level={3}>Detailed Feedback</Title>
              <Divider />

                {!hasFeedback() && !isLoadingFeedback ? (
                <Alert
                  message="No feedback available"
                  description="No feedback has been provided for this submission yet. Please wait for the lecturer to review your work."
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              ) : (
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                  <Title level={5}>Overall Feedback</Title>
                  <TextArea
                    rows={8}
                      value={feedback?.overallFeedback || data.overallFeedback || ""}
                    readOnly
                    placeholder="No overall feedback provided yet."
                  />
                </div>

                  {/* Show detailed feedback sections only if feedback data exists */}
                  {(feedback?.strengths || feedback?.weaknesses || feedback?.codeQuality || feedback?.algorithmEfficiency || feedback?.suggestionsForImprovement || feedback?.bestPractices || feedback?.errorHandling) && (
                    <>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Strengths</Title>
                      <TextArea
                        rows={7}
                              value={feedback?.strengths || ""}
                        readOnly
                              placeholder="No strengths feedback provided yet."
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Weaknesses</Title>
                      <TextArea
                        rows={7}
                              value={feedback?.weaknesses || ""}
                        readOnly
                              placeholder="No weaknesses feedback provided yet."
                      />
                    </div>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Code Quality</Title>
                      <TextArea
                        rows={6}
                              value={feedback?.codeQuality || ""}
                        readOnly
                              placeholder="No code quality feedback provided yet."
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Algorithm Efficiency</Title>
                      <TextArea
                        rows={6}
                              value={feedback?.algorithmEfficiency || ""}
                        readOnly
                              placeholder="No algorithm efficiency feedback provided yet."
                      />
                    </div>
                  </Col>
                </Row>

                <div>
                  <Title level={5}>Suggestions for Improvement</Title>
                  <TextArea
                    rows={8}
                          value={feedback?.suggestionsForImprovement || ""}
                    readOnly
                          placeholder="No suggestions provided yet."
                  />
                </div>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Best Practices</Title>
                      <TextArea
                        rows={6}
                              value={feedback?.bestPractices || ""}
                        readOnly
                              placeholder="No best practices feedback provided yet."
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Error Handling</Title>
                      <TextArea
                        rows={6}
                              value={feedback?.errorHandling || ""}
                        readOnly
                              placeholder="No error handling feedback provided yet."
                      />
                    </div>
                  </Col>
                </Row>
                    </>
                  )}

                {/* Fallback to old format if no detailed feedback and old data exists */}
                {!feedback && data.suggestionsAvoid && (
                  <>
                    <div>
                      <Title level={5}>What you should avoid</Title>
                      <TextArea
                        rows={6}
                        value={data.suggestionsAvoid}
                        readOnly
                      />
                    </div>
                    {data.suggestionsImprove && (
                      <div>
                        <Title level={5}>What you should improve</Title>
                        <TextArea
                          rows={6}
                          value={data.suggestionsImprove}
                          readOnly
                        />
                      </div>
                    )}
                  </>
                )}
              </Space>
              )}
              </Spin>
            </Card>

            {/* Action Buttons */}
            <div style={{ textAlign: "right", marginTop: 16 }}>
              <Space>
              <Button type="primary" onClick={onCancel}>
                Close
              </Button>
              </Space>
            </div>
          </Space>
        </div>
      </Spin>

    </Modal>
  );
};
