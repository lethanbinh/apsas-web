import { useStudent } from "@/hooks/useStudent";
import { queryKeys } from "@/lib/react-query";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assignRequestService } from "@/services/assignRequestService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { FeedbackData, geminiService } from "@/services/geminiService";
import { gradeItemService } from "@/services/gradeItemService";
import { gradingService, GradeItem as GradingServiceGradeItem } from "@/services/gradingService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { submissionService } from "@/services/submissionService";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AssignmentData } from "../../data";
import { defaultEmptyFeedback, deserializeFeedback } from "../utils";

export interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
  questionComment?: string;
}

export const useScoreFeedbackData = (open: boolean, data: AssignmentData) => {
  const { studentId } = useStudent();

  const { data: submissionsData = [], isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['submissions', 'byStudentAndClassAssessment', studentId, data.classAssessmentId],
    queryFn: () => submissionService.getSubmissionList({
      studentId: studentId!,
      classAssessmentId: data.classAssessmentId ?? undefined,
    }),
    enabled: open && !!studentId && !!data.classAssessmentId,
  });

  const lastSubmission = useMemo(() => {
    if (!submissionsData || submissionsData.length === 0) return null;
    const sorted = [...submissionsData].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    return sorted[0];
  }, [submissionsData]);

  const { data: gradingSessionsData, isLoading: isLoadingGradingSessions } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId: lastSubmission?.id!, pageNumber: 1, pageSize: 1 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: lastSubmission!.id,
      pageNumber: 1,
      pageSize: 1,
    }),
    enabled: open && !!lastSubmission?.id,
  });

  const latestGradingSession = useMemo(() => {
    if (!gradingSessionsData?.items || gradingSessionsData.items.length === 0) return null;
    return gradingSessionsData.items[0];
  }, [gradingSessionsData]);

  const { data: gradeItemsData, isLoading: isLoadingGradeItems } = useQuery({
    queryKey: ['gradeItems', 'byGradingSessionId', latestGradingSession?.id],
    queryFn: async () => {
      if (!latestGradingSession) return { items: [] };

      if (latestGradingSession.gradeItems && latestGradingSession.gradeItems.length > 0) {
        return { items: latestGradingSession.gradeItems };
      }

      const gradeItemsResult = await gradeItemService.getGradeItems({
        gradingSessionId: latestGradingSession.id,
        pageNumber: 1,
        pageSize: 1000,
      });

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

  const totalScore = useMemo(() => {
    if (latestGradeItems.length > 0) {
      return latestGradeItems.reduce((sum, item) => sum + item.score, 0);
    }
    if (latestGradingSession?.grade !== undefined && latestGradingSession.grade !== null) {
      return latestGradingSession.grade;
    }
    return 0;
  }, [latestGradeItems, latestGradingSession]);

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

  const rawFeedbackText = useMemo(() => {
    if (!feedbackList || feedbackList.length === 0) return null;
    return feedbackList[0].feedbackText;
  }, [feedbackList]);

  const isFeedbackJson = useMemo(() => {
    if (!rawFeedbackText) return false;
    const parsed = deserializeFeedback(rawFeedbackText);
    return parsed !== null;
  }, [rawFeedbackText]);

  const { data: formattedFeedback, isLoading: isLoadingFormattedFeedback } = useQuery({
    queryKey: ['formattedFeedback', 'gemini', rawFeedbackText],
    queryFn: async () => {
      if (!rawFeedbackText) return null;

      const parsed = deserializeFeedback(rawFeedbackText);
      if (parsed !== null) return null;

      return await geminiService.formatFeedback(rawFeedbackText);
    },
    enabled: open && !!rawFeedbackText && !isFeedbackJson,
    staleTime: Infinity,
  });

  const feedback = useMemo(() => {
    if (!feedbackList || feedbackList.length === 0) return defaultEmptyFeedback;

    const existingFeedback = feedbackList[0];
    let parsedFeedback: FeedbackData | null = deserializeFeedback(existingFeedback.feedbackText);

    if (parsedFeedback === null) {
      if (formattedFeedback) {
        parsedFeedback = formattedFeedback;
      } else {
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

  const effectiveClassId = useMemo(() => {
    if (data.classId) return data.classId;
    const stored = localStorage.getItem("selectedClassId");
    return stored ? Number(stored) : null;
  }, [data.classId]);

  const { data: classAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(effectiveClassId?.toString()!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: effectiveClassId!,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: open && !!effectiveClassId && (!!data.classAssessmentId || !!data.courseElementId),
  });

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

  const { data: templatesData } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: open && !!assessmentTemplateId,
  });

  const template = useMemo(() => {
    if (!templatesData?.items || !assessmentTemplateId) return null;
    return templatesData.items.find((t) => {
      if (t.id !== assessmentTemplateId) return false;
      if (!t.assignRequestId) return false;
      return approvedAssignRequestIds.has(t.assignRequestId);
    });
  }, [templatesData, assessmentTemplateId, approvedAssignRequestIds]);

  const { data: papersData } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(assessmentTemplateId!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplateId!,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: open && !!assessmentTemplateId && !!template,
  });

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
        const rubricQuery = rubricsQueries[questionIndex];
        const questionRubrics = rubricQuery?.data?.items || [];

        const rubricScores: { [rubricId: number]: number } = {};
        const rubricComments: { [rubricId: number]: string } = {};
        let questionComment = "";

        questionRubrics.forEach((rubric) => {
          rubricScores[rubric.id] = 0;
          rubricComments[rubric.id] = "";

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

  const isLoadingFeedbackFormatting = isLoadingFormattedFeedback;

  return {
    lastSubmission,
    latestGradingSession,
    latestGradeItems,
    totalScore,
    feedback,
    questions,
    loading,
    isLoadingFeedbackFormatting,
    isLoadingFeedback,
  };
};

