
"use client";

import React, { useMemo } from "react";
import { Modal, Typography, Image as AntImage, Spin, Collapse, Divider, List } from "antd";
import { Button } from "../ui/Button";
import styles from "./AssignmentList.module.css";
import { RequirementContent } from "./data";
import { classAssessmentService } from "@/services/classAssessmentService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService, AssessmentQuestion } from "@/services/assessmentQuestionService";
import { assessmentFileService } from "@/services/assessmentFileService";
import { assignRequestService } from "@/services/assignRequestService";
import { PaperClipOutlined } from "@ant-design/icons";
import { useQuery, useQueries } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";

const { Title, Paragraph, Text } = Typography;

interface RequirementModalProps {
  open: boolean;
  onCancel: () => void;
  title: string;
  content: RequirementContent[];
  classAssessmentId?: number;
  classId?: number;
  assessmentTemplateId?: number;
  courseElementId?: number;
  examSessionId?: number;
}

const renderRequirementContent = (item: RequirementContent, index: number) => {
  switch (item.type) {
    case "heading":
      return (
        <Title
          level={5}
          key={index}
          style={{ fontWeight: 600, marginTop: "20px" }}
        >
          {item.content}
        </Title>
      );
    case "paragraph":
      return <Paragraph key={index}>{item.content}</Paragraph>;
    case "image":
      return (
        <AntImage
          key={index}
          src={item.src}
          alt="Requirement content"
          className={styles.modalImage}
        />
      );
    default:
      return null;
  }
};

export const RequirementModal: React.FC<RequirementModalProps> = ({
  open,
  onCancel,
  title,
  content,
  classAssessmentId,
  classId,
  assessmentTemplateId: propAssessmentTemplateId,
  courseElementId,
  examSessionId,
}) => {

  const localStorageClassId = typeof window !== 'undefined' ? localStorage.getItem("selectedClassId") : null;
  const effectiveClassId = classId || (localStorageClassId ? Number(localStorageClassId) : undefined);


  const { data: classAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(effectiveClassId!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: effectiveClassId!,
            pageNumber: 1,
            pageSize: 1000,
    }),
    enabled: open && !!effectiveClassId && (!!classAssessmentId || !!courseElementId),
  });


  const assessmentTemplateId = useMemo(() => {
    if (propAssessmentTemplateId) {
      return propAssessmentTemplateId;
          }

    if (classAssessmentId && classAssessmentsData?.items) {
      const classAssessment = classAssessmentsData.items.find(ca => ca.id === classAssessmentId);
              if (classAssessment?.assessmentTemplateId) {
        return classAssessment.assessmentTemplateId;
              }
    }

    if (courseElementId && classAssessmentsData?.items) {
      const classAssessment = classAssessmentsData.items.find(ca => ca.courseElementId === courseElementId);
            if (classAssessment?.assessmentTemplateId) {
        return classAssessment.assessmentTemplateId;
      }
    }

    return null;
  }, [propAssessmentTemplateId, classAssessmentId, courseElementId, classAssessmentsData]);


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
    }) || null;
  }, [templatesData, assessmentTemplateId, approvedAssignRequestIds]);

  const templateDescription = template?.description || "";


  const { data: filesData } = useQuery({
    queryKey: queryKeys.assessmentFiles.byTemplateId(assessmentTemplateId!),
    queryFn: () => assessmentFileService.getFilesForTemplate({
      assessmentTemplateId: assessmentTemplateId!,
          pageNumber: 1,
          pageSize: 100,
    }),
    enabled: open && !!assessmentTemplateId && !!template,
  });

  const files = filesData?.items || [];


  const { data: papersData } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(assessmentTemplateId!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplateId!,
          pageNumber: 1,
          pageSize: 100,
    }),
    enabled: open && !!assessmentTemplateId && !!template,
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
      enabled: open && papers.length > 0,
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


  const loading = (
    (!!effectiveClassId && (!!classAssessmentId || !!courseElementId) && !classAssessmentsData) ||
    (!!assessmentTemplateId && !templatesData) ||
    (!!assessmentTemplateId && !!template && !filesData) ||
    (!!assessmentTemplateId && !!template && !papersData) ||
    questionsQueries.some(q => q.isLoading)
  );

  return (
    <Modal
      title={
        <Title level={4} style={{ margin: 0 }}>
          {title}
        </Title>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <Button variant="primary" onClick={onCancel}>
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
          {files.filter(f => f.fileTemplate !== 1).length > 0 && (
            <>
              <Title level={5}>Requirement Files</Title>
              <List
                dataSource={files.filter(f => f.fileTemplate !== 1)}
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
          {content && content.length > 0 && (
            <>
              <Title level={5}>Requirements</Title>
              {content.map(renderRequirementContent)}
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
};
