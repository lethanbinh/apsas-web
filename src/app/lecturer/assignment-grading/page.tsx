"use client";

import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/react-query";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { courseElementService } from "@/services/courseElementService";
import { FeedbackData, geminiService } from "@/services/geminiService";
import { GradeItem, gradeItemService } from "@/services/gradeItemService";
import { gradingService } from "@/services/gradingService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { Submission, submissionService } from "@/services/submissionService";
import {
  SaveOutlined
} from "@ant-design/icons";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert, App,
  Button,
  Card,
  Collapse,
  Input,
  Space,
  Spin,
  Typography
} from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { FeedbackFields } from "./components/FeedbackFields";
import { FeedbackHistoryModal } from "./components/FeedbackHistoryModal";
import { GradingDetailsSection } from "./components/GradingDetailsSection";
import { GradingHistoryModal } from "./components/GradingHistoryModal";
import { SubmissionHeaderCard } from "./components/SubmissionHeaderCard";
import { ViewExamModal } from "./components/ViewExamModal";
import { useAutoGrading } from "./hooks/useAutoGrading";
import styles from "./page.module.css";

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

  const { autoGradingLoading, handleAutoGrading } = useAutoGrading(
    submission ?? undefined,
    submissionId,
    isSemesterPassed,
    message
  );

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

  // Track processed feedback to avoid duplicate API calls
  const processedFeedbackRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const [isFormattingFeedback, setIsFormattingFeedback] = useState(false);

  // Parse and set feedback
  useEffect(() => {
      if (feedbackList.length > 0) {
        const existingFeedback = feedbackList[0];
        setSubmissionFeedbackId(existingFeedback.id);
        
      // Check if we've already processed this feedback text
      if (processedFeedbackRef.current === existingFeedback.feedbackText) {
        return; // Already processed, skip
      }

        let parsedFeedback: FeedbackData | null = deserializeFeedback(existingFeedback.feedbackText);
        
        if (parsedFeedback === null) {
        // Only call API if not already processing and feedback text is different
        if (!isProcessingRef.current && processedFeedbackRef.current !== existingFeedback.feedbackText) {
          isProcessingRef.current = true;
          processedFeedbackRef.current = existingFeedback.feedbackText;
          setIsFormattingFeedback(true);
          
          // Try to format with Gemini (async, but we'll handle it)
          geminiService.formatFeedback(existingFeedback.feedbackText)
            .then((formatted) => {
              setFeedback(formatted);
              isProcessingRef.current = false;
              setIsFormattingFeedback(false);
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
              isProcessingRef.current = false;
              setIsFormattingFeedback(false);
            });
        }
      } else {
        // Valid parsed feedback, mark as processed
        processedFeedbackRef.current = existingFeedback.feedbackText;
          setFeedback(parsedFeedback);
        setIsFormattingFeedback(false);
      }
    } else {
      // Reset refs when no feedback
      processedFeedbackRef.current = null;
      isProcessingRef.current = false;
      setIsFormattingFeedback(false);
    }
  }, [feedbackList]);

  const loadingFeedback = isLoadingFeedback || isFormattingFeedback;

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
          <SubmissionHeaderCard
            submission={submission}
            totalScore={totalScore}
            totalMaxScore={questions.reduce((sum, q) => {
                  return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
            }, 0)}
            onViewExam={() => setViewExamModalVisible(true)}
            onGetAiFeedback={handleGetAiFeedback}
            loadingAiFeedback={loadingAiFeedback}
            isSemesterPassed={isSemesterPassed}
          />
      </Card>

        <Card className={styles.feedbackCard} style={{ marginTop: 24 }}>
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
                  <Spin spinning={loadingFeedback || loadingAiFeedback}>
                    <div style={{ minHeight: loadingFeedback || loadingAiFeedback ? 200 : 'auto' }}>
                      {!loadingFeedback && !loadingAiFeedback ? (
                        <>
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
                            <FeedbackFields feedbackData={feedback} onFeedbackChange={handleFeedbackChange} />
                      </Space>
                        </>
                      ) : null}
                    </div>
                  </Spin>
                  ),
                },
              ]}
            />
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
                  <GradingDetailsSection
                    questions={questions}
                    latestGradingSession={latestGradingSession}
                    handleRubricScoreChange={handleRubricScoreChange}
                    handleRubricCommentChange={handleRubricCommentChange}
                    isSemesterPassed={isSemesterPassed}
                    message={message}
                    autoGradingLoading={autoGradingLoading}
                    saveGradeLoading={saveGradeMutation.isPending}
                    onAutoGrading={handleAutoGrading}
                    onSaveGrade={handleSave}
                    onOpenGradingHistory={handleOpenGradingHistory}
                    onOpenFeedbackHistory={handleOpenFeedbackHistory}
                  />
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
