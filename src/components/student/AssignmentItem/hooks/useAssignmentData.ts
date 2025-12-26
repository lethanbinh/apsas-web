import { useStudent } from "@/hooks/useStudent";
import { queryKeys } from "@/lib/react-query";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService } from "@/services/assessmentQuestionService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { gradeItemService } from "@/services/gradeItemService";
import { gradingService } from "@/services/gradingService";
import { rubricItemService } from "@/services/rubricItemService";
import { submissionService } from "@/services/submissionService";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useEffect, useRef } from "react";
import { AssignmentData } from "../../data";
export const useAssignmentData = (
    data: AssignmentData,
    isLab: boolean
) => {
    const { studentId } = useStudent();
    const isMountedRef = useRef(true);
    
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    const { data: submissions = [] } = useQuery({
        queryKey: ['submissions', 'byStudent', studentId, data.classAssessmentId, data.examSessionId],
        queryFn: async () => {
            if (!studentId) return [];
            try {
            if (data.classAssessmentId) {
                    return await submissionService.getSubmissionList({
                    studentId: studentId,
                    classAssessmentId: data.classAssessmentId,
                });
            } else if (data.examSessionId) {
                    return await submissionService.getSubmissionList({
                    studentId: studentId,
                    examSessionId: data.examSessionId,
                });
                }
            } catch (error) {
                console.error('Error fetching submissions:', error);
                return [];
            }
            return [];
        },
        enabled: !!studentId && (!!data.classAssessmentId || !!data.examSessionId),
        retry: false,
    });
    const sortedSubmissions = useMemo(() => {
        return [...submissions].sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.submittedAt ? new Date(a.submittedAt).getTime() : 0);
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.submittedAt ? new Date(b.submittedAt).getTime() : 0);
            return dateB - dateA;
        });
    }, [submissions]);
    const lastSubmission = sortedSubmissions.length > 0 ? sortedSubmissions[0] : null;
    const submissionCount = submissions.length;
    const labSubmissionHistory = isLab ? sortedSubmissions.slice(0, 3) : [];
    const labGradingSessionsQueries = useQueries({
        queries: labSubmissionHistory.map((submission) => ({
            queryKey: ['gradingSessions', 'bySubmissionId', submission.id],
            queryFn: async () => {
                try {
                const result = await gradingService.getGradingSessions({
                    submissionId: submission.id,
                    pageNumber: 1,
                    pageSize: 100,
                });
                return {
                    ...result,
                    items: result.items.sort((a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    ),
                };
                } catch (error) {
                    console.error(`Error fetching grading sessions for submission ${submission.id}:`, error);
                    return { items: [], totalCount: 0 };
                }
            },
            enabled: isLab && submission.id > 0 && !!submission.id,
            retry: false,
        })),
    });
    const labGradeItemsQueries = useQueries({
        queries: labGradingSessionsQueries.map((sessionsQuery, index) => {
            const submission = labSubmissionHistory[index];
            const latestSession = sessionsQuery.data?.items?.[0];
            return {
                queryKey: ['gradeItems', 'byGradingSessionId', latestSession?.id],
                queryFn: async () => {
                    try {
                    if (!latestSession) return { items: [] };
                    if (latestSession.gradeItems && latestSession.gradeItems.length > 0) {
                        return { items: latestSession.gradeItems };
                    }
                    return await gradeItemService.getGradeItems({
                        gradingSessionId: latestSession.id,
                        pageNumber: 1,
                        pageSize: 1000,
                    });
                    } catch (error) {
                        console.error(`Error fetching grade items for session ${latestSession?.id}:`, error);
                        return { items: [] };
                    }
                },
                enabled: isLab && !!latestSession?.id && !!submission?.id,
                retry: false,
            };
        }),
    });
    const { data: papersData } = useQuery({
        queryKey: queryKeys.assessmentPapers.byTemplateId(data.assessmentTemplateId!),
        queryFn: () => assessmentPaperService.getAssessmentPapers({
            assessmentTemplateId: data.assessmentTemplateId!,
            pageNumber: 1,
            pageSize: 100,
        }),
        enabled: isLab && !!data.assessmentTemplateId,
    });
    const questionsQueries = useQueries({
        queries: (papersData?.items || []).map((paper) => ({
            queryKey: queryKeys.assessmentQuestions.byPaperId(paper.id),
            queryFn: async () => {
                try {
                    return await assessmentQuestionService.getAssessmentQuestions({
                assessmentPaperId: paper.id,
                pageNumber: 1,
                pageSize: 100,
                    });
                } catch (error) {
                    console.error(`Error fetching questions for paper ${paper.id}:`, error);
                    return { items: [], totalCount: 0 };
                }
            },
            enabled: isLab && !!data.assessmentTemplateId && (papersData?.items || []).length > 0 && !!paper.id,
            retry: false,
        })),
    });
    const allQuestionIds = useMemo(() => {
        const ids: number[] = [];
        questionsQueries.forEach((query) => {
            if (query.data?.items) {
                query.data.items.forEach((q: any) => ids.push(q.id));
            }
        });
        return ids;
    }, [questionsQueries]);
    const rubricsQueries = useQueries({
        queries: allQuestionIds.map((questionId) => ({
            queryKey: queryKeys.rubricItems.byQuestionId(questionId),
            queryFn: async () => {
                try {
                    return await rubricItemService.getRubricsForQuestion({
                assessmentQuestionId: questionId,
                pageNumber: 1,
                pageSize: 100,
                    });
                } catch (error) {
                    console.error(`Error fetching rubrics for question ${questionId}:`, error);
                    return { items: [], totalCount: 0 };
                }
            },
            enabled: isLab && !!data.assessmentTemplateId && allQuestionIds.length > 0 && !!questionId,
            retry: false,
        })),
    });
    const questions = useMemo(() => {
        const questionsList: any[] = [];
        let questionIndex = 0;
        (papersData?.items || []).forEach((paper, paperIndex) => {
            const paperQuestionsQuery = questionsQueries[paperIndex];
            if (!paperQuestionsQuery?.data?.items) return;
            const paperQuestions = [...paperQuestionsQuery.data.items].sort(
                (a: any, b: any) => (a.questionNumber || 0) - (b.questionNumber || 0)
            );
            paperQuestions.forEach((question: any) => {
                const rubricQuery = rubricsQueries[questionIndex];
                const questionRubrics = rubricQuery?.data?.items || [];
                const questionMaxScore = questionRubrics.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
                questionsList.push({
                    ...question,
                    rubrics: questionRubrics,
                    score: questionMaxScore,
                });
                questionIndex++;
            });
        });
        return questionsList;
    }, [papersData, questionsQueries, rubricsQueries]);
    const maxScore = useMemo(() => {
        return questions.reduce((sum, q) => {
            return sum + (q.rubrics || []).reduce((rubricSum: number, rubric: any) => rubricSum + (rubric.score || 0), 0);
        }, 0);
    }, [questions]);
    const { data: classAssessmentsData } = useQuery({
        queryKey: queryKeys.classAssessments.byClassId(data.classId?.toString()!),
        queryFn: () => classAssessmentService.getClassAssessments({
            classId: data.classId!,
            pageNumber: 1,
            pageSize: 1000,
        }),
        enabled: !!data.classId && !!data.classAssessmentId,
    });
    const classAssessment = useMemo(() => {
        if (!classAssessmentsData?.items || !data.classAssessmentId) return null;
        return classAssessmentsData.items.find(ca => ca.id === data.classAssessmentId) || null;
    }, [classAssessmentsData, data.classAssessmentId]);
    const isPublished = classAssessment?.isPublished ?? data.isPublished ?? false;
    const autoGradedScores = useMemo(() => {
        const scoreMap: Record<number, { total: number; max: number }> = {};
        labSubmissionHistory.forEach((submission, index) => {
            const gradeItemsQuery = labGradeItemsQueries[index];
            const sessionsQuery = labGradingSessionsQueries[index];
            if (gradeItemsQuery?.data?.items && gradeItemsQuery.data.items.length > 0) {
                const totalScore = gradeItemsQuery.data.items.reduce((sum: number, item: any) => sum + (item.score || 0), 0);
                scoreMap[submission.id] = { total: totalScore, max: maxScore };
            } else if (sessionsQuery?.data?.items?.[0]?.grade !== undefined && sessionsQuery.data.items[0].grade !== null) {
                scoreMap[submission.id] = { total: sessionsQuery.data.items[0].grade, max: maxScore };
            }
        });
        return scoreMap;
    }, [labSubmissionHistory, labGradeItemsQueries, labGradingSessionsQueries, maxScore]);
    const labSubmissionScores = useMemo(() => {
        const scoreMap: Record<number, { total: number; max: number }> = {};
        if (!isPublished) {
            return scoreMap;
        }
        labSubmissionHistory.forEach((submission, index) => {
            const gradeItemsQuery = labGradeItemsQueries[index];
            const sessionsQuery = labGradingSessionsQueries[index];
            if (gradeItemsQuery?.data?.items && gradeItemsQuery.data.items.length > 0) {
                const totalScore = gradeItemsQuery.data.items.reduce((sum: number, item: any) => sum + (item.score || 0), 0);
                const latestSession = sessionsQuery?.data?.items?.[0];
                if (latestSession && latestSession.status === 1) {
                    scoreMap[submission.id] = { total: totalScore, max: maxScore };
                }
            } else if (sessionsQuery?.data?.items?.[0]?.grade !== undefined && sessionsQuery.data.items[0].grade !== null) {
                const latestSession = sessionsQuery.data.items[0];
                if (latestSession.status === 1) {
                    scoreMap[submission.id] = { total: latestSession.grade, max: maxScore };
                }
            }
        });
        return scoreMap;
    }, [labSubmissionHistory, labGradeItemsQueries, labGradingSessionsQueries, maxScore, isPublished]);
    return {
        lastSubmission,
        submissionCount,
        labSubmissionHistory,
        labSubmissionScores,
        autoGradedScores,
        isPublished,
    };
};