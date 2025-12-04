import { useQueries, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { GradeItem, gradeItemService } from "@/services/gradeItemService";
import { gradingGroupService } from "@/services/gradingGroupService";
import { gradingService } from "@/services/gradingService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { submissionFeedbackService } from "@/services/submissionFeedbackService";
import { Submission, submissionService } from "@/services/submissionService";
import { useMemo } from "react";
import type { QuestionWithRubrics } from "../page";
import { deserializeFeedback, getDefaultFeedback } from "../utils/feedbackUtils";

interface UseSubmissionDataParams {
  submissionId: number | null;
  classIdFromStorage: string | null;
}

export function useSubmissionData({ submissionId, classIdFromStorage }: UseSubmissionDataParams) {
  // Fetch class assessments to find submission
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

  // Find the specific submission
  const submissionFromClassAssessments = useMemo(() => {
    if (!submissionId) return null;
    for (const query of submissionsQueries) {
      if (query.data) {
        const found = query.data.find((s: Submission) => s.id === submissionId);
        if (found) return found;
      }
    }
    return null;
  }, [submissionId, submissionsQueries]);

  // Fallback: fetch all submissions if not found in class assessments
  const { data: allSubmissionsData } = useQuery({
    queryKey: ['submissions', 'all'],
    queryFn: () => submissionService.getSubmissionList({}),
    enabled: !!submissionId && !submissionFromClassAssessments && classAssessmentIds.length === 0,
  });

  const submissionFromAll = useMemo(() => {
    if (!submissionId || !allSubmissionsData) return null;
    return allSubmissionsData.find((s: Submission) => s.id === submissionId) || null;
  }, [submissionId, allSubmissionsData]);

  const finalSubmission = submissionFromClassAssessments || submissionFromAll;

  // Determine assessmentTemplateId
  const { data: gradingGroupsData } = useQuery({
    queryKey: queryKeys.grading.groups.all,
    queryFn: () => gradingGroupService.getGradingGroups({}),
    enabled: !!finalSubmission?.gradingGroupId,
  });

  const assessmentTemplateId = useMemo(() => {
    if (!finalSubmission) return null;
    if (finalSubmission.gradingGroupId && gradingGroupsData) {
      const gradingGroup = gradingGroupsData.find((gg) => gg.id === finalSubmission.gradingGroupId);
      if (gradingGroup?.assessmentTemplateId) {
        return gradingGroup.assessmentTemplateId;
      }
    }
    if (finalSubmission.classAssessmentId && classAssessmentsData?.items) {
      const classAssessment = classAssessmentsData.items.find(
        (ca) => ca.id === finalSubmission.classAssessmentId
      );
      if (classAssessment?.assessmentTemplateId) {
        return classAssessment.assessmentTemplateId;
      }
    }
    return null;
  }, [finalSubmission, gradingGroupsData, classAssessmentsData]);

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

  // Fetch questions for each paper
  const papers = papersData?.items || [];
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

  // Fetch rubrics for each question
  const allQuestions = useMemo(() => {
    const questions: AssessmentQuestion[] = [];
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

  // Build questions with rubrics
  const questionsWithRubrics = useMemo(() => {
    const questionsWithRubrics: QuestionWithRubrics[] = [];
    allQuestions.forEach((question, index) => {
      const rubrics = rubricsQueries[index]?.data?.items || [];
      questionsWithRubrics.push({
        ...question,
        rubrics,
        rubricScores: {},
        rubricComments: {},
      });
    });
    return questionsWithRubrics;
  }, [allQuestions, rubricsQueries]);

  // Fetch latest grading session
  const { data: gradingSessionsData } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId!, pageNumber: 1, pageSize: 1 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: submissionId!,
      pageNumber: 1,
      pageSize: 1, // Only fetch latest
    }),
    enabled: !!submissionId,
  });

  const latestGradingSession = useMemo(() => {
    if (!gradingSessionsData?.items || gradingSessionsData.items.length === 0) return null;
    return gradingSessionsData.items[0];
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

  // Map grade items to questions
  const questionsWithScores = useMemo((): QuestionWithRubrics[] => {
    if (latestGradeItems.length === 0) return questionsWithRubrics;

    // Filter to get only the latest grade item for each rubricItemId
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
      if (item.rubricItemId) {
        if (!latestGradeItemsMap.has(item.rubricItemId)) {
          latestGradeItemsMap.set(item.rubricItemId, item);
        }
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
          newRubricScores[rubric.id] = matchingGradeItem.score;
          if (!questionComment && matchingGradeItem.comments) {
            questionComment = matchingGradeItem.comments;
          }
        }
      });

      newRubricComments[question.id] = questionComment;

      return {
        ...question,
        rubricScores: newRubricScores,
        rubricComments: newRubricComments,
      };
    });
  }, [questionsWithRubrics, latestGradeItems]);

  // Calculate total score
  const totalScore = useMemo(() => {
    if (latestGradeItems.length > 0) {
      return latestGradeItems.reduce((sum, item) => sum + item.score, 0);
    }
    return latestGradingSession?.grade || 0;
  }, [latestGradeItems, latestGradingSession]);

  // Fetch feedback
  const { data: feedbackListData } = useQuery({
    queryKey: ['submissionFeedback', 'bySubmissionId', submissionId],
    queryFn: () => submissionFeedbackService.getSubmissionFeedbackList({
      submissionId: submissionId!,
    }),
    enabled: !!submissionId,
  });

  const feedback = useMemo(() => {
    if (!feedbackListData || feedbackListData.length === 0) {
      return getDefaultFeedback();
    }

    const existingFeedback = feedbackListData[0];
    const parsedFeedback = deserializeFeedback(existingFeedback.feedbackText);

    if (parsedFeedback) {
      return parsedFeedback;
    }

    // If not structured, return plain text in overallFeedback
    return {
      ...getDefaultFeedback(),
      overallFeedback: existingFeedback.feedbackText,
    };
  }, [feedbackListData]);

  const loading = useMemo(() => {
    return (
      (submissionsQueries.some(q => q.isLoading) && !finalSubmission) ||
      (!!submissionId && !finalSubmission && !allSubmissionsData) ||
      (!!assessmentTemplateId && !papersData) ||
      questionsQueries.some(q => q.isLoading) ||
      rubricsQueries.some(q => q.isLoading) ||
      (!!submissionId && !gradingSessionsData) ||
      (!!latestGradingSession?.id && !gradeItemsData) ||
      (!!submissionId && !feedbackListData)
    );
  }, [submissionsQueries, finalSubmission, submissionId, allSubmissionsData, assessmentTemplateId, papersData, questionsQueries, rubricsQueries, gradingSessionsData, latestGradingSession, gradeItemsData, feedbackListData]);

  return {
    finalSubmission,
    questionsWithScores,
    latestGradingSession,
    totalScore,
    feedback,
    loading,
  };
}

