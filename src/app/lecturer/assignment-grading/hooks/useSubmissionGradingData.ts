import { queryKeys } from "@/lib/react-query";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { courseElementService } from "@/services/courseElementService";
import { GradeItem, gradeItemService } from "@/services/gradeItemService";
import { gradingService } from "@/services/gradingService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission, submissionService } from "@/services/submissionService";
import { useQueries, useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useEffect, useMemo, useState } from "react";

dayjs.extend(utc);
dayjs.extend(timezone);

const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

export interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
}

export interface UseSubmissionGradingDataResult {
  submission: Submission | null;
  isLoadingSubmissions: boolean;
  latestGradingSession: any;
  latestGradeItems: GradeItem[];
  questions: QuestionWithRubrics[];
  assessmentTemplateId: number | null;
  isSemesterPassed: boolean;
  semesterInfo: { startDate: string; endDate: string } | null;
  userEdits: { rubricScores: Record<string, number>; rubricComments: Record<number, string> };
  setUserEdits: React.Dispatch<React.SetStateAction<{ rubricScores: Record<string, number>; rubricComments: Record<number, string> }>>;
  totalScore: number;
  setTotalScore: React.Dispatch<React.SetStateAction<number>>;
}

export function useSubmissionGradingData(
  submissionId: number | null
): UseSubmissionGradingDataResult {
  const [isSemesterPassed, setIsSemesterPassed] = useState(false);
  const [semesterInfo, setSemesterInfo] = useState<{ startDate: string; endDate: string } | null>(null);
  const [userEdits, setUserEdits] = useState<{ rubricScores: Record<string, number>; rubricComments: Record<number, string>; }>({
    rubricScores: {},
    rubricComments: {},
  });
  const [totalScore, setTotalScore] = useState(0);


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


  const isLoadingSubmissions = submissionsQueries.some((q: any) => q.isLoading) || isLoadingAllSubmissions;

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

  const { data: gradingGroupsData } = useQuery({
    queryKey: queryKeys.grading.groups.list({}),
    queryFn: async () => {
      const { gradingGroupService } = await import("@/services/gradingGroupService");
      return gradingGroupService.getGradingGroups({});
    },
    enabled: !!submission?.gradingGroupId,
  });

  const { data: allClassAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.list({ pageNumber: 1, pageSize: 10000 }),
    queryFn: () => classAssessmentService.getClassAssessments({
      pageNumber: 1,
      pageSize: 10000,
    }),
    enabled: !!submission?.classAssessmentId && !classAssessmentsData,
  });

  const assessmentTemplateId = useMemo(() => {
    if (!submission) return null;

    if (submission.gradingGroupId && gradingGroupsData) {
      const gradingGroup = gradingGroupsData.find((gg) => gg.id === submission.gradingGroupId);
      if (gradingGroup?.assessmentTemplateId) {
        return gradingGroup.assessmentTemplateId;
      }
    }

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
      enabled: allQuestionsFromQueries.length > 0,
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

  useEffect(() => {
    setUserEdits({
      rubricScores: {},
      rubricComments: {},
    });
  }, [submissionId]);

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

  const { data: courseElementsData } = useQuery({
    queryKey: queryKeys.courseElements.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => courseElementService.getCourseElements({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!classAssessmentForSemester?.courseElementId,
  });

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

  return {
    submission,
    isLoadingSubmissions,
    latestGradingSession,
    latestGradeItems,
    questions,
    assessmentTemplateId,
    isSemesterPassed,
    semesterInfo,
    userEdits,
    setUserEdits,
    totalScore,
    setTotalScore,
  };
}

