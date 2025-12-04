"use client";

import { queryKeys } from "@/lib/react-query";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission } from "@/services/submissionService";
import { App, Collapse, Divider, Modal, Spin, Typography } from "antd";
import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

const { Title, Text } = Typography;

interface ViewExamModalProps {
  visible: boolean;
  onClose: () => void;
  submission: Submission | null;
}

export function ViewExamModal({ visible, onClose, submission }: ViewExamModalProps) {
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

