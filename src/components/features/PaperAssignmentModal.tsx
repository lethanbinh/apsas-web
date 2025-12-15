"use client";

import React, { useMemo } from "react";
import { Modal, Typography, Spin, Collapse, Table, Tag, Space, Divider, List } from "antd";
import { Button } from "../ui/Button";
import styles from "./PaperAssignmentModal.module.css";
import { classAssessmentService } from "@/services/classAssessmentService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService, AssessmentQuestion } from "@/services/assessmentQuestionService";
import { rubricItemService, RubricItem } from "@/services/rubricItemService";
import { assessmentFileService } from "@/services/assessmentFileService";
import { PaperClipOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  AssessmentTemplate,
} from "@/services/assessmentTemplateService";
import { useQuery, useQueries } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";

const { Title, Paragraph, Text } = Typography;

interface PaperAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: AssessmentTemplate;
  classAssessmentId?: number;
  classId?: number;
}

export default function PaperAssignmentModal({
  isOpen,
  onClose,
  template,
  classAssessmentId,
  classId,
}: PaperAssignmentModalProps) {

  const effectiveClassId = classId || (typeof window !== 'undefined' ? Number(localStorage.getItem("selectedClassId")) : undefined);


  const { data: classAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(effectiveClassId!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: effectiveClassId!,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: isOpen && !!classAssessmentId && !!effectiveClassId && !template?.id,
  });


  const assessmentTemplateId = useMemo(() => {
    if (template?.id) {
      return template.id;
    }

    if (classAssessmentId && classAssessmentsData?.items) {
      const classAssessment = classAssessmentsData.items.find(ca => ca.id === classAssessmentId);
      if (classAssessment?.assessmentTemplateId) {
        return classAssessment.assessmentTemplateId;
      }
    }

    return null;
  }, [template?.id, classAssessmentId, classAssessmentsData]);


  const { data: templatesData } = useQuery({
    queryKey: queryKeys.assessmentTemplates.list({ pageNumber: 1, pageSize: 1000 }),
    queryFn: () => assessmentTemplateService.getAssessmentTemplates({
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: isOpen && !!assessmentTemplateId,
  });

  const templateData = useMemo(() => {
    if (template) return template;
    if (templatesData?.items && assessmentTemplateId) {
      return templatesData.items.find(t => t.id === assessmentTemplateId);
    }
    return null;
  }, [template, templatesData, assessmentTemplateId]);

  const templateDescription = templateData?.description || "";


  const { data: filesData } = useQuery({
    queryKey: queryKeys.assessmentFiles.byTemplateId(assessmentTemplateId!),
    queryFn: () => assessmentFileService.getFilesForTemplate({
      assessmentTemplateId: assessmentTemplateId!,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: isOpen && !!assessmentTemplateId,
  });

  const files = filesData?.items || [];


  const { data: papersData } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(assessmentTemplateId!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplateId!,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: isOpen && !!assessmentTemplateId,
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
      enabled: isOpen && papers.length > 0,
    })),
  });


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


  const allQuestionIds = useMemo(() => {
    return Object.values(questions).flat().map(q => q.id);
  }, [questions]);


  const rubricsQueries = useQueries({
    queries: allQuestionIds.map((questionId) => ({
      queryKey: queryKeys.rubricItems.byQuestionId(questionId),
      queryFn: () => rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: questionId,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: isOpen && allQuestionIds.length > 0,
    })),
  });


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


  const loading = (
    (!!classAssessmentId && !!effectiveClassId && !template?.id && !classAssessmentsData) ||
    (!!assessmentTemplateId && !templatesData) ||
    (!!assessmentTemplateId && !filesData) ||
    (!!assessmentTemplateId && !papersData) ||
    questionsQueries.some(q => q.isLoading) ||
    rubricsQueries.some(q => q.isLoading)
  );

  const getQuestionColumns = (question: AssessmentQuestion): ColumnsType<RubricItem> => [
    {
      title: "Criteria",
      dataIndex: "description",
      key: "description",
      width: "40%",
    },
    {
      title: "Input",
      dataIndex: "input",
      key: "input",
      width: "25%",
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
      width: "25%",
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
      render: (score: number) => <Tag color="blue">{score}</Tag>,
    },
  ];

  return (
    <Modal
      title={
        <Title level={4} style={{ margin: 0 }}>
          {templateData?.name || template?.name || "Assignment Paper"}
        </Title>
      }
      open={isOpen}
      onCancel={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
      width={1000}
      className={styles.requirementModal}
      style={{ top: 20 }}
    >
      <Spin spinning={loading}>
        <div className={styles.modalBody}>
          {}
          {templateDescription && (
            <>
              <Title level={5}>Description</Title>
              <Paragraph>{templateDescription}</Paragraph>
              <Divider />
            </>
          )}

          {}
          {files.length > 0 && (
            <>
              <Title level={5}>Requirement Files</Title>
              <List
                dataSource={files}
                renderItem={(file) => (
                  <List.Item>
                    <a
                      href={file.fileUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <PaperClipOutlined style={{ marginRight: 8 }} />
                      {file.name}
                    </a>
                  </List.Item>
                )}
              />
              <Divider />
            </>
          )}

          {}
          {papers.length > 0 && (
            <>
              <Title level={5}>Exam Papers & Questions</Title>
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
                      {questions[paper.id]?.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((question, qIndex) => (
                        <div key={question.id} style={{ marginBottom: 24 }}>
                          <Title level={5}>
                            Question {qIndex + 1} (Score: {question.score})
                          </Title>
                          <Paragraph>{question.questionText}</Paragraph>

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

                          {}
                          {rubrics[question.id] && rubrics[question.id].length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <Text strong>Grading Criteria:</Text>
                              <Table
                                columns={getQuestionColumns(question)}
                                dataSource={rubrics[question.id]}
                                rowKey="id"
                                pagination={false}
                                size="small"
                                style={{ marginTop: 8 }}
                              />
                            </div>
                          )}

                          <Divider />
                        </div>
                      ))}
                    </div>
                  ),
                }))}
              />
            </>
          )}
        </div>
      </Spin>
    </Modal>
  );
}
