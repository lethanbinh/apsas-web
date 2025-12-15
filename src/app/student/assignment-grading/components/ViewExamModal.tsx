"use client";

import { queryKeys } from "@/lib/react-query";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { gradingGroupService } from "@/services/gradingGroupService";
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

  const classIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem("selectedClassId") : null;
  const { data: classAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(classIdFromStorage!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: Number(classIdFromStorage!),
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!classIdFromStorage && !!submission?.classAssessmentId && visible,
  });

  const { data: gradingGroupsData } = useQuery({
    queryKey: queryKeys.grading.groups.all,
    queryFn: () => gradingGroupService.getGradingGroups({}),
    enabled: !!submission?.gradingGroupId && visible,
  });

  const assessmentTemplateId = useMemo(() => {
    if (!submission) return null;
    if (submission.gradingGroupId && gradingGroupsData) {
      const gradingGroup = gradingGroupsData.find((gg) => gg.id === submission.gradingGroupId);
      if (gradingGroup?.assessmentTemplateId) {
        return gradingGroup.assessmentTemplateId;
      }
    }
    if (submission.classAssessmentId && classAssessmentsData?.items) {
      const classAssessment = classAssessmentsData.items.find(
        (ca) => ca.id === submission.classAssessmentId
      );
      if (classAssessment?.assessmentTemplateId) {
        return classAssessment.assessmentTemplateId;
      }
    }
    return null;
  }, [submission, gradingGroupsData, classAssessmentsData]);


  const { data: papersData } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(assessmentTemplateId!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplateId!,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: !!assessmentTemplateId && visible,
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
      enabled: papers.length > 0 && visible,
    })),
  });

  const questions = useMemo(() => {
    const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
    questionsQueries.forEach((query, index) => {
      if (query.data?.items && papers[index]) {
        questionsMap[papers[index].id] = query.data.items.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
      }
    });
    return questionsMap;
  }, [questionsQueries, papers]);


  const allQuestions = useMemo(() => {
    const questions: AssessmentQuestion[] = [];
    questionsQueries.forEach((query) => {
      if (query.data?.items) {
        questions.push(...query.data.items);
      }
    });
    return questions;
  }, [questionsQueries]);

  const rubricsQueries = useQueries({
    queries: allQuestions.map((question) => ({
      queryKey: queryKeys.rubricItems.byQuestionId(question.id),
      queryFn: () => rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: question.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: allQuestions.length > 0 && visible,
    })),
  });

  const rubrics = useMemo(() => {
    const rubricsMap: { [questionId: number]: RubricItem[] } = {};
    allQuestions.forEach((question, index) => {
      if (rubricsQueries[index]?.data?.items) {
        rubricsMap[question.id] = rubricsQueries[index].data!.items;
      }
    });
    return rubricsMap;
  }, [allQuestions, rubricsQueries]);

  const loading = useMemo(() => {
    return (
      (!!submission?.gradingGroupId && !gradingGroupsData) ||
      (!!submission?.classAssessmentId && !classAssessmentsData) ||
      (!!assessmentTemplateId && !papersData) ||
      questionsQueries.some(q => q.isLoading) ||
      rubricsQueries.some(q => q.isLoading)
    );
  }, [submission, gradingGroupsData, classAssessmentsData, assessmentTemplateId, papersData, questionsQueries, rubricsQueries]);

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
        {!assessmentTemplateId ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">Cannot find assessment template</Text>
          </div>
        ) : (
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
                          Question {qIndex + 1} (Score: {question.score})
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
                                  {rubric.description} (Max: {rubric.score} points)
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
        )}
      </Spin>
    </Modal>
  );
}

