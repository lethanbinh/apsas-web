"use client";

import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { FeedbackData } from "@/services/geminiService";
import { gradingService, GradingSession } from "@/services/gradingService";
import { gradeItemService, GradeItem } from "@/services/gradeItemService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission, submissionService } from "@/services/submissionService";
import { submissionFeedbackService, SubmissionFeedback } from "@/services/submissionFeedbackService";
import { geminiService } from "@/services/geminiService";
import { semesterService } from "@/services/semesterService";
import { courseElementService } from "@/services/courseElementService";
import { Alert } from "antd";
import {
  ArrowLeftOutlined,
  EyeOutlined,
  HistoryOutlined,
  RobotOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography
} from "antd";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState, useRef, useMemo } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import styles from "./page.module.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { classService } from "@/services/classService";
import { useAuth } from "@/hooks/useAuth";

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
}

export default function AssignmentGradingPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { user } = useAuth();
  const [submissionId, setSubmissionId] = useState<number | null>(null);

  const [viewExamModalVisible, setViewExamModalVisible] = useState(false);
  const [gradingHistoryModalVisible, setGradingHistoryModalVisible] = useState(false);
  const [feedbackHistoryModalVisible, setFeedbackHistoryModalVisible] = useState(false);
  const [isSemesterPassed, setIsSemesterPassed] = useState(false);
  const [semesterInfo, setSemesterInfo] = useState<{ startDate: string; endDate: string } | null>(null);
  const [userEdits, setUserEdits] = useState<{ rubricScores: Record<string, number>; rubricComments: Record<number, string>; }>({
    rubricScores: {},
    rubricComments: {},
  });
  const [totalScore, setTotalScore] = useState(0);
  const [autoGradingLoading, setAutoGradingLoading] = useState(false);
  const autoGradingPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
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


  useEffect(() => {
    // Get submissionId from localStorage
    const savedSubmissionId = localStorage.getItem("selectedSubmissionId");
    if (savedSubmissionId) {
      setSubmissionId(Number(savedSubmissionId));
    } else {
      message.error("No submission selected");
      router.back();
    }
  }, []);

  useEffect(() => {
    if (submissionId) {
      // Reset state to allow editing
      setIsSemesterPassed(false);
      // Reset feedback to empty when submissionId changes
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
    }
  }, [submissionId]);

  // Fetch class assessments to find submission
  const classIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem("selectedClassId") : null;
  const { data: classAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(classIdFromStorage!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: Number(classIdFromStorage!),
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!classIdFromStorage && !!submissionId,
  });

  // Fetch submissions for all class assessments
  const classAssessmentIds = classAssessmentsData?.items.map(ca => ca.id) || [];
  const submissionsQueries = useQueries({
    queries: classAssessmentIds.map((classAssessmentId) => ({
      queryKey: ['submissions', 'byClassAssessmentId', classAssessmentId],
      queryFn: () => submissionService.getSubmissionList({
        classAssessmentId: classAssessmentId,
      }),
      enabled: classAssessmentIds.length > 0 && !!submissionId,
    })),
  });

  // Find submission from class assessments
  const submissionFromClass = useMemo(() => {
    if (!submissionId) return null;
    for (const query of submissionsQueries) {
      if (query.data) {
        const found = query.data.find((s: Submission) => s.id === submissionId);
        if (found) return found;
      }
    }
    return null;
  }, [submissionsQueries, submissionId]);

  // Fallback: fetch all submissions if not found in class assessments
  const { data: allSubmissionsData = [], isLoading: isLoadingAllSubmissions } = useQuery({
    queryKey: ['submissions', 'all'],
    queryFn: () => submissionService.getSubmissionList({}),
    enabled: !!submissionId && !submissionFromClass,
  });

  const submission = useMemo(() => {
    if (!submissionId) return null;
    if (submissionFromClass) return submissionFromClass;
    return allSubmissionsData.find((s: Submission) => s.id === submissionId) || null;
  }, [submissionId, submissionFromClass, allSubmissionsData]);

  // Check if any submission query is still loading
  const isLoadingSubmissions = submissionsQueries.some((q: any) => q.isLoading) || isLoadingAllSubmissions;

  // Handle submission not found - only redirect after all queries have finished loading
  useEffect(() => {
    if (!submission && submissionId && !isLoadingSubmissions) {
      // Only show error and redirect if we've finished loading and still can't find it
      message.error("Submission not found");
      router.back();
    }
  }, [submission, submissionId, isLoadingSubmissions, message, router]);

  // Clear feedback localStorage when submissionId changes
  useEffect(() => {
    if (submissionId) {
      localStorage.removeItem(`feedback_${submissionId}`);
    }
  }, [submissionId]);

  // Fetch latest grading session using TanStack Query
  const { data: gradingSessionsData } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId!, pageNumber: 1, pageSize: 100 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: submissionId!,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: !!submissionId,
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
    enabled: !!latestGradingSession?.id,
  });

  const latestGradeItems = gradeItemsData?.items || [];

  // Determine assessmentTemplateId from submission
  const { data: gradingGroupsData } = useQuery({
    queryKey: queryKeys.grading.groups.list({}),
    queryFn: async () => {
      const { gradingGroupService } = await import("@/services/gradingGroupService");
      return gradingGroupService.getGradingGroups({});
    },
    enabled: !!submission?.gradingGroupId,
  });

  // Also fetch all class assessments as fallback
  const { data: allClassAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.list({ pageNumber: 1, pageSize: 10000 }),
    queryFn: () => classAssessmentService.getClassAssessments({
      pageNumber: 1,
      pageSize: 10000,
    }),
    enabled: !!submission?.classAssessmentId && !classAssessmentsData,
  });

  // Determine assessmentTemplateId
  const assessmentTemplateId = useMemo(() => {
    if (!submission) return null;

    // Try to get from gradingGroupId first (most reliable)
    if (submission.gradingGroupId && gradingGroupsData) {
      const gradingGroup = gradingGroupsData.find((gg) => gg.id === submission.gradingGroupId);
      if (gradingGroup?.assessmentTemplateId) {
        return gradingGroup.assessmentTemplateId;
      }
    }

    // Try to get from classAssessmentId
    if (submission.classAssessmentId) {
      if (classAssessmentsData?.items) {
        const classAssessment = classAssessmentsData.items.find(
          (ca) => ca.id === submission.classAssessmentId
        );
        if (classAssessment?.assessmentTemplateId) {
          return classAssessment.assessmentTemplateId;
        }
      }

      if (allClassAssessmentsData?.items) {
        const classAssessment = allClassAssessmentsData.items.find(
          (ca) => ca.id === submission.classAssessmentId
        );
        if (classAssessment?.assessmentTemplateId) {
          return classAssessment.assessmentTemplateId;
        }
      }
    }

    return null;
  }, [submission, gradingGroupsData, classAssessmentsData, allClassAssessmentsData]);

  // Fetch papers
  const { data: papersData } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(assessmentTemplateId!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplateId!,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: !!assessmentTemplateId,
  });

  const papers = papersData?.items || [];

  // Fetch questions for all papers
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

  // Get all questions from queries
  const allQuestionsFromQueries = useMemo(() => {
    const questions: AssessmentQuestion[] = [];
    questionsQueries.forEach((query) => {
      if (query.data?.items) {
        questions.push(...query.data.items);
      }
    });
    return questions.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
  }, [questionsQueries]);

  // Fetch rubrics for all questions
  const rubricsQueries = useQueries({
    queries: allQuestionsFromQueries.map((question) => ({
      queryKey: queryKeys.rubricItems.byQuestionId(question.id),
      queryFn: () => rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: question.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: allQuestionsFromQueries.length > 0,
    })),
  });

  // Combine questions with rubrics
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

  // Reset user edits when submissionId changes
  useEffect(() => {
    setUserEdits({
      rubricScores: {},
      rubricComments: {},
    });
  }, [submissionId]);

  // Derive questions from queries and grade items
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
            // Use user edit if exists, otherwise use grade item score
            const editKey = `${question.id}_${rubric.id}`;
            newRubricScores[rubric.id] = userEdits.rubricScores[editKey] !== undefined 
              ? userEdits.rubricScores[editKey] 
              : matchingGradeItem.score;
            if (!questionComment && matchingGradeItem.comments) {
              questionComment = matchingGradeItem.comments;
            }
          } else {
            // Check if user has edited this rubric
            const editKey = `${question.id}_${rubric.id}`;
            if (userEdits.rubricScores[editKey] !== undefined) {
              newRubricScores[rubric.id] = userEdits.rubricScores[editKey];
            }
          }
        });

        // Use user edit comment if exists, otherwise use from grade item
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
    
    // If no grade items, still apply user edits
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

  // Calculate total score from questions
  useEffect(() => {
    const calculatedTotal = questions.reduce((sum, q) => {
      const questionTotal = Object.values(q.rubricScores).reduce(
        (qSum, score) => qSum + (score || 0),
        0
      );
      return sum + questionTotal;
    }, 0);
    setTotalScore(calculatedTotal);
  }, [questions]);

  // Get class assessment for semester info
  const classAssessmentForSemester = useMemo(() => {
    if (!submission?.classAssessmentId) return null;
    if (classAssessmentsData?.items) {
      return classAssessmentsData.items.find(ca => ca.id === submission.classAssessmentId);
    }
    if (allClassAssessmentsData?.items) {
      return allClassAssessmentsData.items.find(ca => ca.id === submission.classAssessmentId);
    }
    return null;
  }, [submission, classAssessmentsData, allClassAssessmentsData]);

  // Fetch course elements for semester info
  const { data: courseElementsData } = useQuery({
    queryKey: queryKeys.courseElements.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!classAssessmentForSemester?.courseElementId,
  });

  // Determine semester info
  const semesterInfoFromQuery = useMemo(() => {
    if (!classAssessmentForSemester?.courseElementId || !courseElementsData) return null;
    const courseElement = courseElementsData.find(
      (el) => el.id === classAssessmentForSemester.courseElementId
    );
    if (courseElement?.semesterCourse?.semester) {
      return {
        startDate: courseElement.semesterCourse.semester.startDate,
        endDate: courseElement.semesterCourse.semester.endDate,
      };
    }
    return null;
  }, [classAssessmentForSemester, courseElementsData]);

  // Update semester info and check if passed
  useEffect(() => {
    if (semesterInfoFromQuery) {
      setSemesterInfo(semesterInfoFromQuery);
      const now = dayjs().tz("Asia/Ho_Chi_Minh");
      const semesterEnd = toVietnamTime(semesterInfoFromQuery.endDate);
      const hasPassed = now.isAfter(semesterEnd, 'day');
      setIsSemesterPassed(hasPassed);
    } else {
      setSemesterInfo(null);
      setIsSemesterPassed(false);
    }
  }, [semesterInfoFromQuery]);


  const handleRubricScoreChange = (
    questionId: number,
    rubricId: number,
    score: number | null,
    maxScore: number
  ) => {
    const scoreValue = score || 0;
    
    // Validate: score cannot exceed max score
    if (scoreValue > maxScore) {
      message.error(`Score cannot exceed maximum score of ${maxScore.toFixed(2)}`);
      return;
    }
    
    const editKey = `${questionId}_${rubricId}`;
    setUserEdits((prev) => ({
      ...prev,
      rubricScores: {
        ...prev.rubricScores,
        [editKey]: scoreValue,
      },
    }));
  };

  const handleRubricCommentChange = (
    questionId: number,
    rubricId: number,
    comment: string
  ) => {
    setUserEdits((prev) => ({
      ...prev,
      rubricComments: {
        ...prev.rubricComments,
        [questionId]: comment,
      },
    }));
  };

  /**
   * Serialize feedback data to JSON string
   */
  const serializeFeedback = (feedbackData: FeedbackData): string => {
    return JSON.stringify(feedbackData);
  };

  /**
   * Deserialize JSON string to feedback data
   * Handles both JSON format and plain text/markdown format
   * Returns null if feedback is not JSON format
   */
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
      // Try to parse as JSON first
      const parsed = JSON.parse(feedbackText);
      
      // Validate that it's a valid FeedbackData object
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
      
      // If parsed is not an object, fall through to plain text handling
      throw new Error("Parsed result is not an object");
    } catch (error) {
      // If JSON parsing fails, it's plain text/markdown
      // Return null to indicate it needs processing
      return null;
    }
  };

  // Fetch feedback using TanStack Query
  const { data: feedbackList = [], isLoading: isLoadingFeedback } = useQuery({
    queryKey: ['submissionFeedback', 'bySubmissionId', submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const list = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submissionId,
      });
      return list;
    },
    enabled: !!submissionId,
  });

  // Parse and set feedback
  useEffect(() => {
    if (feedbackList.length > 0) {
      const existingFeedback = feedbackList[0];
      setSubmissionFeedbackId(existingFeedback.id);
      
      let parsedFeedback: FeedbackData | null = deserializeFeedback(existingFeedback.feedbackText);
      
      if (parsedFeedback === null) {
        // Try to format with Gemini (async, but we'll handle it)
        geminiService.formatFeedback(existingFeedback.feedbackText)
          .then((formatted) => {
            setFeedback(formatted);
          })
          .catch((error) => {
            console.error("Failed to parse feedback with Gemini:", error);
            setFeedback({
              overallFeedback: existingFeedback.feedbackText,
              strengths: "",
              weaknesses: "",
              codeQuality: "",
              algorithmEfficiency: "",
              suggestionsForImprovement: "",
              bestPractices: "",
              errorHandling: "",
            });
          });
      } else {
        setFeedback(parsedFeedback);
      }
    }
  }, [feedbackList]);

  const loadingFeedback = isLoadingFeedback;

  // Mutation for saving feedback
  const saveFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: FeedbackData) => {
      if (!submissionId) {
        throw new Error("No submission selected");
      }

      const feedbackText = serializeFeedback(feedbackData);

      if (submissionFeedbackId) {
        return submissionFeedbackService.updateSubmissionFeedback(submissionFeedbackId, {
          feedbackText: feedbackText,
        });
      } else {
        const newFeedback = await submissionFeedbackService.createSubmissionFeedback({
          submissionId: submissionId,
          feedbackText: feedbackText,
        });
        setSubmissionFeedbackId(newFeedback.id);
        return newFeedback;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissionFeedback', 'bySubmissionId', submissionId] });
      message.success("Feedback saved successfully");
    },
    onError: (error: any) => {
      console.error("Failed to save feedback:", error);
      message.error(error?.message || "Failed to save feedback");
    },
  });

  const saveFeedback = async (feedbackData: FeedbackData) => {
    saveFeedbackMutation.mutate(feedbackData);
  };

  // Mutation for getting AI feedback
  const getAiFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!submissionId) {
        throw new Error("No submission selected");
      }
      return gradingService.getFormattedAiFeedback(submissionId, "OpenAI");
    },
    onSuccess: (formattedFeedback) => {
      setFeedback(formattedFeedback);
      saveFeedbackMutation.mutate(formattedFeedback);
      message.success("AI feedback retrieved and saved successfully!");
    },
    onError: (error: any) => {
      console.error("Failed to get AI feedback:", error);
      let errorMessage = "Failed to get AI feedback. Please try again.";
      if (error?.apiResponse?.errorMessages && error.apiResponse.errorMessages.length > 0) {
        errorMessage = error.apiResponse.errorMessages.join(", ");
      } else if (error?.response?.data) {
        const apiError = error.response.data;
        if (apiError.errorMessages && apiError.errorMessages.length > 0) {
          errorMessage = apiError.errorMessages.join(", ");
        } else if (apiError.message) {
          errorMessage = apiError.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      message.error(errorMessage);
    },
  });

  const handleGetAiFeedback = async () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }
    getAiFeedbackMutation.mutate();
  };

  const loadingAiFeedback = getAiFeedbackMutation.isPending;

  const handleOpenGradingHistory = () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }
    setGradingHistoryModalVisible(true);
  };

  const handleOpenFeedbackHistory = () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }
    setFeedbackHistoryModalVisible(true);
  };

  // Fetch grading history using TanStack Query (for modal)
  const { data: gradingHistoryData, isLoading: loadingGradingHistory } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId!, pageNumber: 1, pageSize: 1000 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: submissionId!,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: gradingHistoryModalVisible && !!submissionId,
  });

  const gradingHistory = useMemo(() => {
    if (!gradingHistoryData?.items) return [];
    return [...gradingHistoryData.items].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [gradingHistoryData]);

  // Fetch feedback history using TanStack Query (for modal)
  const { data: feedbackHistoryData, isLoading: loadingFeedbackHistory } = useQuery({
    queryKey: ['submissionFeedbackHistory', 'bySubmissionId', submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const list = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submissionId,
      });
      return [...list].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    },
    enabled: feedbackHistoryModalVisible && !!submissionId,
  });

  const feedbackHistory = feedbackHistoryData || [];

  // Render feedback fields - always show all input fields (empty or with content)
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

    // Always render all fields (empty or with content)
    const fieldsToRender = fields;

    const elements: ReactNode[] = [];
    let currentRow: Array<typeof fields[0]> = [];

    fieldsToRender.forEach((field, index) => {
      const value = feedbackData[field.key] || "";

      if (field.fullWidth) {
        // If there's a pending row, render it first
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
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            );
          }
          currentRow = [];
        }

        // Render full-width field
        elements.push(
          <div key={`field-${field.key}`}>
            <Title level={5}>{field.label}</Title>
            <TextArea
              rows={field.rows}
              value={value}
              onChange={(e) => handleFeedbackChange(field.key, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}...`}
            />
          </div>
        );
      } else {
        currentRow.push(field);

        // If row is full (2 items) or it's the last item, render the row
        if (currentRow.length === 2 || index === fieldsToRender.length - 1) {
          if (currentRow.length === 1) {
            elements.push(
              <div key={`field-${currentRow[0].key}`}>
                <Title level={5}>{currentRow[0].label}</Title>
                <TextArea
                  rows={currentRow[0].rows}
                  value={feedbackData[currentRow[0].key] || ""}
                  onChange={(e) => handleFeedbackChange(currentRow[0].key, e.target.value)}
                  placeholder={`Enter ${currentRow[0].label.toLowerCase()}...`}
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

  const handleAutoGrading = async () => {
    if (!submissionId || !submission) {
      message.error("No submission selected");
      return;
    }

    // Check if semester has passed
    if (isSemesterPassed) {
      message.warning("Cannot use auto grading when the semester has ended.");
      return;
    }

    try {
      setAutoGradingLoading(true);

      // Get assessmentTemplateId (same logic as fetchQuestionsAndRubrics)
      let assessmentTemplateId: number | null = null;

      // Try to get assessmentTemplateId from gradingGroupId first (most reliable)
      if (submission.gradingGroupId) {
        try {
          const { gradingGroupService } = await import("@/services/gradingGroupService");
          const gradingGroups = await gradingGroupService.getGradingGroups({});
          const gradingGroup = gradingGroups.find((gg) => gg.id === submission.gradingGroupId);
          if (gradingGroup?.assessmentTemplateId) {
            assessmentTemplateId = gradingGroup.assessmentTemplateId;
            console.log("Found assessmentTemplateId from gradingGroup:", assessmentTemplateId);
          }
        } catch (err) {
          console.error("Failed to fetch from gradingGroup:", err);
        }
      }

      // Try to get assessmentTemplateId from classAssessmentId
      if (!assessmentTemplateId && submission.classAssessmentId) {
        try {
          // First try with classId from localStorage
          const classId = localStorage.getItem("selectedClassId");
          if (classId) {
            const classAssessmentsRes = await classAssessmentService.getClassAssessments({
              classId: Number(classId),
              pageNumber: 1,
              pageSize: 1000,
            });
            const classAssessment = classAssessmentsRes.items.find(
              (ca) => ca.id === submission.classAssessmentId
            );
            if (classAssessment?.assessmentTemplateId) {
              assessmentTemplateId = classAssessment.assessmentTemplateId;
              console.log("Found assessmentTemplateId from classAssessment (localStorage classId):", assessmentTemplateId);
            }
          }

          // If not found, try to fetch classAssessment by ID directly
          if (!assessmentTemplateId) {
            try {
              const allClassAssessmentsRes = await classAssessmentService.getClassAssessments({
                pageNumber: 1,
                pageSize: 10000, // Large page size to get all
              });
              const classAssessment = allClassAssessmentsRes.items.find(
                (ca) => ca.id === submission.classAssessmentId
              );
              if (classAssessment?.assessmentTemplateId) {
                assessmentTemplateId = classAssessment.assessmentTemplateId;
                console.log("Found assessmentTemplateId from classAssessment (all classes):", assessmentTemplateId);
              }
            } catch (err) {
              // If that fails, try fetching from multiple classes
              console.log("Trying to fetch from multiple classes...");
              const { classService } = await import("@/services/classService");
              try {
                // Try to get all classes first
                const classes = await classService.getClassList({ pageNumber: 1, pageSize: 100 });
                for (const classItem of classes.classes || []) {
                  try {
                    const classAssessmentsRes = await classAssessmentService.getClassAssessments({
                      classId: classItem.id,
                      pageNumber: 1,
                      pageSize: 1000,
                    });
                    const classAssessment = classAssessmentsRes.items.find(
                      (ca) => ca.id === submission.classAssessmentId
                    );
                    if (classAssessment?.assessmentTemplateId) {
                      assessmentTemplateId = classAssessment.assessmentTemplateId;
                      console.log(`Found assessmentTemplateId from classAssessment (classId ${classItem.id}):`, assessmentTemplateId);
                      break;
                    }
                  } catch (err) {
                    // Continue to next class
                  }
                }
              } catch (err) {
                console.error("Failed to fetch from multiple classes:", err);
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch from classAssessment:", err);
        }
      }

      if (!assessmentTemplateId) {
        message.error("Cannot find assessment template. Please contact administrator.");
        setAutoGradingLoading(false);
        return;
      }

      // Call auto grading API
      const gradingSession = await gradingService.autoGrading({
        submissionId: submission.id,
        assessmentTemplateId: assessmentTemplateId,
      });

      // Invalidate queries to refresh (including grading history modal)
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 1000 }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submission.id, pageNumber: 1, pageSize: 100 }) });

      // If status is 0 (PROCESSING), start polling
      if (gradingSession.status === 0) {
        message.loading("Auto grading in progress...", 0);
        
        // Poll every 2 seconds until status changes
        const pollInterval = setInterval(async () => {
          try {
            const sessionsResult = await gradingService.getGradingSessions({
              submissionId: submission.id,
              pageNumber: 1,
              pageSize: 100,
            });

            if (sessionsResult.items.length > 0) {
              const sortedSessions = [...sessionsResult.items].sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA;
              });

              const latestSession = sortedSessions[0];

              // If status is no longer PROCESSING (0), stop polling
              if (latestSession.status !== 0) {
                if (autoGradingPollIntervalRef.current) {
                  clearInterval(autoGradingPollIntervalRef.current);
                  autoGradingPollIntervalRef.current = null;
                }
                message.destroy();
                setAutoGradingLoading(false);
                
                // Invalidate queries to refresh data (including grading history modal)
                queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId, pageNumber: 1, pageSize: 1000 }) });
                queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId, pageNumber: 1, pageSize: 100 }) });
                queryClient.invalidateQueries({ queryKey: ['gradeItems', 'byGradingSessionId'] });
                queryClient.invalidateQueries({ queryKey: ['gradeItemHistory'] });
                
                if (latestSession.status === 1) {
                  message.success("Auto grading completed successfully");
                } else if (latestSession.status === 2) {
                  message.error("Auto grading failed");
                }
              }
            }
          } catch (err: any) {
            console.error("Failed to poll grading status:", err);
            if (autoGradingPollIntervalRef.current) {
              clearInterval(autoGradingPollIntervalRef.current);
              autoGradingPollIntervalRef.current = null;
            }
            message.destroy();
            setAutoGradingLoading(false);
            message.error(err.message || "Failed to check grading status");
          }
        }, 2000); // Poll every 2 seconds

        autoGradingPollIntervalRef.current = pollInterval;

        // Stop polling after 5 minutes (safety timeout)
        setTimeout(() => {
          if (autoGradingPollIntervalRef.current) {
            clearInterval(autoGradingPollIntervalRef.current);
            autoGradingPollIntervalRef.current = null;
          }
          message.destroy();
          setAutoGradingLoading(false);
        }, 300000); // 5 minutes
      } else {
        // Status is not PROCESSING, grading completed immediately
        setAutoGradingLoading(false);
        // Invalidate queries to refresh data (including grading history modal)
        queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId, pageNumber: 1, pageSize: 1000 }) });
        queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId, pageNumber: 1, pageSize: 100 }) });
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
      setAutoGradingLoading(false);
      const errorMessage = err.message || "Failed to start auto grading";
      message.error(errorMessage);
    }
  };

  // Mutation for saving grades
  const saveGradeMutation = useMutation({
    mutationFn: async () => {
      if (!submissionId || !submission) {
        throw new Error("No submission selected");
      }

      // Calculate total score from all rubric scores
      let calculatedTotal = 0;
      questions.forEach((q) => {
        const questionTotal = Object.values(q.rubricScores).reduce(
          (sum, score) => sum + (score || 0),
          0
        );
        calculatedTotal += questionTotal;
      });
      setTotalScore(calculatedTotal);

      // Ensure we have a grading session
      let gradingSessionId: number;

      if (latestGradingSession) {
        gradingSessionId = latestGradingSession.id;
      } else {
        // Create new grading session
        let assessmentTemplateId: number | null = null;

        if (submission.gradingGroupId) {
          try {
            const { gradingGroupService } = await import("@/services/gradingGroupService");
            const gradingGroups = await gradingGroupService.getGradingGroups({});
            const gradingGroup = gradingGroups.find((gg) => gg.id === submission.gradingGroupId);
            if (gradingGroup?.assessmentTemplateId) {
              assessmentTemplateId = gradingGroup.assessmentTemplateId;
            }
          } catch (err) {
            console.error("Failed to fetch grading group:", err);
          }
        }

        if (!assessmentTemplateId) {
          throw new Error("Cannot find assessment template. Please contact administrator.");
        }

        // Create grading session
        await gradingService.createGrading({
          submissionId: submission.id,
          assessmentTemplateId: assessmentTemplateId,
        });

        // Fetch the newly created session
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
          throw new Error("Failed to create grading session");
        }
      }
      
      // Save all grade items (create or update)
      for (const question of questions) {
        // Get comment for this question (stored with question.id as key)
        const questionComment = question.rubricComments?.[question.id] || "";
        
        for (const rubric of question.rubrics) {
          const score = question.rubricScores[rubric.id] || 0;
          const existingGradeItem = latestGradeItems.find(
            (item) => item.rubricItemId === rubric.id
          );

          if (existingGradeItem) {
            // Update existing grade item
            await gradeItemService.updateGradeItem(existingGradeItem.id, {
              score: score,
              comments: questionComment,
            });
          } else {
            // Create new grade item
            await gradeItemService.createGradeItem({
              gradingSessionId: gradingSessionId,
              rubricItemId: rubric.id,
              score: score,
              comments: questionComment,
            });
          }
        }
      }

      // Update grading session with total score (status defaults to COMPLETED)
      await gradingService.updateGradingSession(gradingSessionId, {
        grade: calculatedTotal,
        status: 1, // COMPLETED
      });

      return { gradingSessionId, calculatedTotal };
    },
    onSuccess: () => {
      message.success("Grade saved successfully");
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId!, pageNumber: 1, pageSize: 100 }) });
      queryClient.invalidateQueries({ queryKey: ['gradeItems', 'byGradingSessionId'] });
      // Invalidate feedback queries
      queryClient.invalidateQueries({ queryKey: ['submissionFeedback', 'bySubmissionId', submissionId] });
    },
    onError: (err: any) => {
      console.error("Failed to save grade:", err);
      message.error(err.message || "Failed to save grade");
    },
  });

  const handleSave = async () => {
    if (!submissionId || !submission) {
      message.error("No submission selected");
      return;
    }

    // Check if semester has passed
    if (isSemesterPassed) {
      message.warning("Cannot edit grades when the semester has ended.");
      return;
    }

    // Validate all scores before saving
    for (const question of questions) {
      for (const rubric of question.rubrics) {
        const score = question.rubricScores[rubric.id] || 0;
        if (score > rubric.score) {
          message.error(`Score for "${rubric.description || rubric.id}" cannot exceed maximum score of ${rubric.score.toFixed(2)}`);
          return;
        }
      }
    }

    saveGradeMutation.mutate();
  };

  const handleFeedbackChange = (field: keyof FeedbackData, value: string) => {
    setFeedback((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Save feedback manually (when user edits feedback fields)
   */
  const handleSaveFeedback = async () => {
    if (!submissionId) {
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


  const isLoadingSubmissionData = isLoadingSubmissions && !submission && !!submissionId;

  if (isLoadingSubmissionData) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (!submission) {
    return null;
  }

  const getQuestionColumns = (question: QuestionWithRubrics) => [
    {
      title: "Criteria",
      dataIndex: "description",
      key: "description",
      width: "25%",
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
    {
      title: "Output",
      dataIndex: "output",
      key: "output",
      width: "15%",
      render: (text: string) => (
        <Text code style={{ fontSize: "12px" }}>
          {text || "N/A"}
        </Text>
      ),
    },
    {
      title: "Max Score",
      dataIndex: "score",
      key: "maxScore",
      width: "10%",
      align: "center" as const,
      render: (score: number) => <Tag color="blue">{score.toFixed(2)}</Tag>,
    },
    {
      title: "Score",
      key: "rubricScore",
      width: "25%",
      render: (_: any, record: RubricItem) => {
        const currentScore = question.rubricScores[record.id] || 0;
        return (
          <InputNumber
            min={0}
            max={record.score}
            value={currentScore}
            onChange={(value) =>
              handleRubricScoreChange(question.id, record.id, value, record.score)
            }
            onBlur={() => {
              // Double check on blur - if current score exceeds max, reset it
              const currentValue = question.rubricScores[record.id] || 0;
              if (currentValue > record.score) {
                message.error(`Score cannot exceed maximum score of ${record.score.toFixed(2)}`);
                // Reset to max score if exceeds
                handleRubricScoreChange(question.id, record.id, record.score, record.score);
              }
            }}
            style={{ width: "100%" }}
            step={0.01}
            precision={2}
            disabled={isSemesterPassed}
          />
        );
      },
    },
  ];

  return (
    <App>
    <div className={styles.container}>
        {isSemesterPassed && (
        <Alert
          message="Semester Ended"
          description="Cannot edit grades when the semester has ended."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Card className={styles.headerCard}>
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <div className={styles.headerActions}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
            >
              Back
            </Button>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={() => setViewExamModalVisible(true)}
              >
                View Exam
              </Button>
              <Button
                  icon={<RobotOutlined />}
                  onClick={handleGetAiFeedback}
                  loading={loadingAiFeedback}
                  disabled={isSemesterPassed}
              >
                  Get AI Feedback
              </Button>
            </Space>
      </div>

          <Descriptions bordered column={2}>
            <Descriptions.Item label="Submission ID">{submission.id}</Descriptions.Item>
            <Descriptions.Item label="Student Code">
              {submission.studentCode}
            </Descriptions.Item>
            <Descriptions.Item label="Student Name">
              {submission.studentName}
            </Descriptions.Item>
            <Descriptions.Item label="Submitted At">
              {submission.submittedAt
                ? toVietnamTime(submission.submittedAt).format("DD/MM/YYYY HH:mm:ss")
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Submission File">
              {submission.submissionFile?.name || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Total Score">
              <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
                {totalScore.toFixed(2)}/{questions.reduce((sum, q) => {
                  return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
                }, 0).toFixed(2)}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

        <Card className={styles.feedbackCard} style={{ marginTop: 24 }}>
          <Spin spinning={loadingFeedback || loadingAiFeedback}>
            <Collapse
              defaultActiveKey={[]}
              className={`${styles.collapseWrapper} collapse-feedback`}
              items={[
                {
                  key: "feedback",
                  label: (
                    <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center" }}>
                      Detailed Feedback
                    </Title>
                  ),
                  children: (
                    <div>
                      <Space direction="horizontal" style={{ width: "100%", marginBottom: 16, justifyContent: "space-between" }}>
                        <Text type="secondary" style={{ display: "block" }}>
                          Provide comprehensive feedback for the student's submission
                        </Text>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          onClick={handleSaveFeedback}
                          disabled={loadingFeedback || loadingAiFeedback}
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
          </Spin>
        </Card>

        <Card className={styles.questionsCard} style={{ marginTop: 24 }}>
        <Collapse 
            defaultActiveKey={["grading-details"]}
            className={`${styles.collapseWrapper} collapse-grading`}
            items={[
              {
                key: "grading-details",
                label: (
                  <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center" }}>
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
                            Total Max Score: {questions.reduce((sum, q) => {
                              return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
                            }, 0).toFixed(2)}
                          </Text>
                          <Space direction="vertical" style={{ width: "100%" }}>
                            <Button
                              type="default"
                              icon={<RobotOutlined />}
                              onClick={handleAutoGrading}
                              loading={autoGradingLoading}
                              disabled={isSemesterPassed}
                              block
                            >
                              Auto Grading
                            </Button>
                            <Button
                              type="primary"
                              icon={<SaveOutlined />}
                              onClick={handleSave}
                              loading={saveGradeMutation.isPending}
                              disabled={isSemesterPassed}
                              block
                            >
                              Save Grade
                            </Button>
                            <Button
                              type="default"
                              icon={<HistoryOutlined />}
                              onClick={handleOpenGradingHistory}
                              block
                            >
                              Grading History
                            </Button>
                            <Button
                              type="default"
                              icon={<HistoryOutlined />}
                              onClick={handleOpenFeedbackHistory}
                              block
                            >
                              Feedback History
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
                <div className={styles.questionHeader}>
                  <span>
                    <strong>Question {index + 1}:</strong> {question.questionText}
                  </span>
                  <Space>
                    <Tag color="blue">
                      Score: {questionTotalScore.toFixed(2)}/{questionMaxScore.toFixed(2)}
                    </Tag>
                    <Tag color="green">Max: {question.score.toFixed(2)}</Tag>
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

                  <Title level={5}>Grading Criteria ({question.rubrics.length})</Title>
                  <Table
                    columns={getQuestionColumns(question)}
                    dataSource={question.rubrics}
                    rowKey="id"
                    pagination={false}
                    size="small"
                                    scroll={{ x: "max-content" }}
                                  />
                                  
        <Divider />

                                  <div style={{ marginTop: 16 }}>
                                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                                      Comments
                                    </Text>
            <TextArea
              rows={15}
                                      value={question.rubricComments?.[question.id] || ""}
                                      onChange={(e) =>
                                        handleRubricCommentChange(question.id, question.id, e.target.value)
                                      }
                                      placeholder="Enter comments for this question..."
                                      style={{ width: "100%" }}
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

      <ViewExamModal
        visible={viewExamModalVisible}
        onClose={() => setViewExamModalVisible(false)}
        submission={submission}
            />

        <GradingHistoryModal
          visible={gradingHistoryModalVisible}
          onClose={() => setGradingHistoryModalVisible(false)}
          submissionId={submissionId}
        />

        <FeedbackHistoryModal
          visible={feedbackHistoryModalVisible}
          onClose={() => setFeedbackHistoryModalVisible(false)}
          submissionId={submissionId}
        />
          </div>
    </App>
  );
}
function ViewExamModal({
  visible,
  onClose,
  submission,
}: {
  visible: boolean;
  onClose: () => void;
  submission: Submission | null;
}) {
  const { message } = App.useApp();
  const { Title, Text } = Typography;

  // Determine assessmentTemplateId using queries
  const localStorageClassId = typeof window !== 'undefined' ? localStorage.getItem("selectedClassId") : null;
  const effectiveClassId = localStorageClassId ? Number(localStorageClassId) : undefined;

  // Fetch grading groups if submission has gradingGroupId
  const { data: gradingGroupsData } = useQuery({
    queryKey: queryKeys.grading.groups.list({}),
    queryFn: async () => {
      const { gradingGroupService } = await import("@/services/gradingGroupService");
      return gradingGroupService.getGradingGroups({});
    },
    enabled: visible && !!submission?.gradingGroupId,
  });

  // Fetch class assessments if submission has classAssessmentId
  const { data: classAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(effectiveClassId!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: effectiveClassId!,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: visible && !!submission?.classAssessmentId && !!effectiveClassId,
  });

  // Also fetch all class assessments as fallback
  const { data: allClassAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.list({ pageNumber: 1, pageSize: 10000 }),
    queryFn: () => classAssessmentService.getClassAssessments({
      pageNumber: 1,
      pageSize: 10000,
    }),
    enabled: visible && !!submission?.classAssessmentId && (!effectiveClassId || !classAssessmentsData),
  });

  // Determine assessmentTemplateId
  const assessmentTemplateId = useMemo(() => {
    if (!submission) return null;

    // Try to get from gradingGroupId first (most reliable)
    if (submission.gradingGroupId && gradingGroupsData) {
      const gradingGroup = gradingGroupsData.find((gg) => gg.id === submission.gradingGroupId);
      if (gradingGroup?.assessmentTemplateId) {
        return gradingGroup.assessmentTemplateId;
      }
    }

    // Try to get from classAssessmentId
    if (submission.classAssessmentId) {
      if (classAssessmentsData?.items) {
        const classAssessment = classAssessmentsData.items.find(
          (ca) => ca.id === submission.classAssessmentId
        );
        if (classAssessment?.assessmentTemplateId) {
          return classAssessment.assessmentTemplateId;
        }
      }

      if (allClassAssessmentsData?.items) {
        const classAssessment = allClassAssessmentsData.items.find(
          (ca) => ca.id === submission.classAssessmentId
        );
        if (classAssessment?.assessmentTemplateId) {
          return classAssessment.assessmentTemplateId;
        }
      }
    }

    return null;
  }, [submission, gradingGroupsData, classAssessmentsData, allClassAssessmentsData]);

  // Fetch papers
  const { data: papersData } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(assessmentTemplateId!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplateId!,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: visible && !!assessmentTemplateId,
  });

  const papers = papersData?.items || [];

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

  // Map questions by paperId
  const questions = useMemo(() => {
    const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
    papers.forEach((paper, index) => {
      const query = questionsQueries[index];
      if (query.data?.items) {
        const sortedQuestions = [...query.data.items].sort((a, b) => 
          (a.questionNumber || 0) - (b.questionNumber || 0)
        );
        questionsMap[paper.id] = sortedQuestions;
      }
    });
    return questionsMap;
  }, [papers, questionsQueries]);

  // Get all question IDs for fetching rubrics
  const allQuestionIds = useMemo(() => {
    return Object.values(questions).flat().map(q => q.id);
  }, [questions]);

  // Fetch rubrics for all questions
  const rubricsQueries = useQueries({
    queries: allQuestionIds.map((questionId) => ({
      queryKey: queryKeys.rubricItems.byQuestionId(questionId),
      queryFn: () => rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: questionId,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: visible && allQuestionIds.length > 0,
    })),
  });

  // Map rubrics by questionId
  const rubrics = useMemo(() => {
    const rubricsMap: { [questionId: number]: RubricItem[] } = {};
    allQuestionIds.forEach((questionId, index) => {
      const query = rubricsQueries[index];
      if (query.data?.items) {
        rubricsMap[questionId] = query.data.items;
      }
    });
    return rubricsMap;
  }, [allQuestionIds, rubricsQueries]);

  // Calculate loading state
  const loading = (
    (!!submission?.gradingGroupId && !gradingGroupsData) ||
    (!!submission?.classAssessmentId && !!effectiveClassId && !classAssessmentsData) ||
    (!!submission?.classAssessmentId && !effectiveClassId && !allClassAssessmentsData) ||
    (!!assessmentTemplateId && !papersData) ||
    questionsQueries.some(q => q.isLoading) ||
    rubricsQueries.some(q => q.isLoading)
  );

  return (
    <Modal
      title="View Exam"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      style={{ top: 20 }}
    >
      <Spin spinning={loading}>
        <div>
          <Divider />

          <Collapse
            items={papers.map((paper, paperIndex) => ({
              key: paper.id.toString(),
              label: (
                <div>
                  <strong>Paper {paperIndex + 1}: {paper.name}</strong>
                  {paper.description && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      - {paper.description}
                    </Text>
                  )}
                </div>
              ),
              children: (
                <div>
                  {questions[paper.id]?.map((question, qIndex) => (
                    <div key={question.id} style={{ marginBottom: 24 }}>
                      <Title level={5}>
                        Question {qIndex + 1} (Score: {question.score.toFixed(2)})
                      </Title>
                      <Text>{question.questionText}</Text>

                      {question.questionSampleInput && (
                        <div style={{ marginTop: 12 }}>
                          <Text strong>Sample Input:</Text>
                          <pre style={{ background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
                            {question.questionSampleInput}
                          </pre>
          </div>
                      )}

                      {question.questionSampleOutput && (
                        <div style={{ marginTop: 12 }}>
                          <Text strong>Sample Output:</Text>
                          <pre style={{ background: "#f5f5f5", padding: 8, borderRadius: 4 }}>
                            {question.questionSampleOutput}
                          </pre>
        </div>
                      )}

                      {rubrics[question.id] && rubrics[question.id].length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <Text strong>Grading Criteria:</Text>
                          <ul>
                            {rubrics[question.id].map((rubric) => (
                              <li key={rubric.id}>
                                {rubric.description} (Max: {rubric.score.toFixed(2)} points)
                                {rubric.input && rubric.input !== "N/A" && (
                                  <div style={{ marginLeft: 20, fontSize: "12px", color: "#666" }}>
                                    Input: <code>{rubric.input}</code>
          </div>
                                )}
                                {rubric.output && rubric.output !== "N/A" && (
                                  <div style={{ marginLeft: 20, fontSize: "12px", color: "#666" }}>
                                    Output: <code>{rubric.output}</code>
          </div>
                                )}
                              </li>
                            ))}
                          </ul>
        </div>
                      )}

                      <Divider />
                    </div>
                  ))}
      </div>
              ),
            }))}
          />
    </div>
      </Spin>
    </Modal>
  );
}

function GradingHistoryModal({
  visible,
  onClose,
  submissionId,
}: {
  visible: boolean;
  onClose: () => void;
  submissionId: number | null;
}) {
  const { message } = App.useApp();
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  // Fetch grading history using TanStack Query
  const { data: gradingHistoryData, isLoading: loading } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId!, pageNumber: 1, pageSize: 1000 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: submissionId!,
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
      return dateB - dateA;
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

  const handleExpandSession = (sessionId: number) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const [gradeItemHistoryModalVisible, setGradeItemHistoryModalVisible] = useState(false);
  const [selectedGradeItem, setSelectedGradeItem] = useState<GradeItem | null>(null);

  const handleOpenGradeItemHistory = (gradeItem: GradeItem) => {
    setSelectedGradeItem(gradeItem);
    setGradeItemHistoryModalVisible(true);
  };

  // Fetch grade item history using TanStack Query
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
    enabled: gradeItemHistoryModalVisible && !!selectedGradeItem,
  });

  const gradeItemHistory = gradeItemHistoryData?.items || [];

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
      render: (_: any, record: GradeItem) => {
        // Count how many times this grade item was edited
        // We'll fetch this in the modal, but for now show a button
        return (
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleOpenGradeItemHistory(record)}
          >
            Edit History
          </Button>
        );
      },
    },
  ];

  return (
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
      <Spin spinning={loading}>
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
                          <Tag color="green">Total: {totalScore.toFixed(2)}</Tag>
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
    </Modal>
  );
}

function FeedbackHistoryModal({
  visible,
  onClose,
  submissionId,
}: {
  visible: boolean;
  onClose: () => void;
  submissionId: number | null;
}) {
  // Fetch feedback history using TanStack Query
  const { data: feedbackHistoryData, isLoading: loading } = useQuery({
    queryKey: ['submissionFeedbackHistory', 'bySubmissionId', submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const list = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submissionId,
      });
      return [...list].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    },
    enabled: visible && !!submissionId,
  });

  const feedbackHistory = feedbackHistoryData || [];
  const { message } = App.useApp();
  const [expandedFeedbacks, setExpandedFeedbacks] = useState<Set<number>>(new Set());
  const { Title, Text } = Typography;
  const { TextArea } = Input;

  /**
   * Deserialize feedback text to FeedbackData
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
      // Not JSON, return null to indicate plain text
      return null;
    }
  };

  const handleExpandFeedback = (feedbackId: number) => {
    const newExpanded = new Set(expandedFeedbacks);
    const isCurrentlyExpanded = newExpanded.has(feedbackId);
    
    if (isCurrentlyExpanded) {
      newExpanded.delete(feedbackId);
    } else {
      newExpanded.add(feedbackId);
    }
    
    setExpandedFeedbacks(newExpanded);
  };

  const renderFeedbackFields = (feedbackData: FeedbackData) => {
    const fields: Array<{ key: keyof FeedbackData; label: string }> = [
      { key: "overallFeedback", label: "Overall Feedback" },
      { key: "strengths", label: "Strengths" },
      { key: "weaknesses", label: "Weaknesses" },
      { key: "codeQuality", label: "Code Quality" },
      { key: "algorithmEfficiency", label: "Algorithm Efficiency" },
      { key: "suggestionsForImprovement", label: "Suggestions for Improvement" },
      { key: "bestPractices", label: "Best Practices" },
      { key: "errorHandling", label: "Error Handling" },
    ];

    return fields.map((field) => {
      const value = feedbackData[field.key] || "";
      if (!value) return null;

      return (
        <div key={field.key} style={{ marginBottom: 16 }}>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            {field.label}:
          </Text>
          <TextArea
            value={value}
            readOnly
            rows={value.split("\n").length + 1}
            style={{ backgroundColor: "#f5f5f5" }}
          />
        </div>
      );
    });
  };

  return (
    <Modal
      title="Feedback History"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={1000}
    >
      <Spin spinning={loading}>
        {feedbackHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">No feedback history available</Text>
          </div>
        ) : (
          <Collapse
            items={feedbackHistory.map((feedback) => {
              const isExpanded = expandedFeedbacks.has(feedback.id);
              const parsedFeedback = deserializeFeedback(feedback.feedbackText);
              const isPlainText = parsedFeedback === null;

              return {
                key: feedback.id.toString(),
                label: (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <div>
                      <Text strong>Feedback #{feedback.id}</Text>
                      <Space style={{ marginLeft: 16 }}>
                        {isPlainText ? (
                          <Tag color="orange">Plain Text</Tag>
                        ) : (
                          <Tag color="green">Structured</Tag>
                        )}
                      </Space>
                    </div>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {toVietnamTime(feedback.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                    </Text>
                  </div>
                ),
                children: (
                  <div>
                    <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                      <Descriptions.Item label="Feedback ID">{feedback.id}</Descriptions.Item>
                      <Descriptions.Item label="Submission ID">{feedback.submissionId}</Descriptions.Item>
                      <Descriptions.Item label="Created At" span={2}>
                        {toVietnamTime(feedback.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Descriptions.Item>
                      <Descriptions.Item label="Updated At" span={2}>
                        {toVietnamTime(feedback.updatedAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Descriptions.Item>
                    </Descriptions>

                    {isPlainText ? (
                      <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                          Feedback Content:
                        </Text>
                        <TextArea
                          value={feedback.feedbackText}
                          readOnly
                          rows={feedback.feedbackText.split("\n").length + 3}
                          style={{ backgroundColor: "#f5f5f5", fontFamily: "monospace" }}
                        />
                      </div>
                    ) : (
                      <div>
                        <Title level={5} style={{ marginTop: 16, marginBottom: 16 }}>
                          Feedback Details
                        </Title>
                        {renderFeedbackFields(parsedFeedback!)}
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
  );
}
