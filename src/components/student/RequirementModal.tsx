
"use client";

import React, { useMemo } from "react";
import { Modal, Typography, Image as AntImage, Spin, Collapse, Divider, List, Button as AntButton } from "antd";
import { RequirementContent } from "./data";
import { classAssessmentService } from "@/services/classAssessmentService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService, AssessmentQuestion } from "@/services/assessmentQuestionService";
import { assessmentFileService } from "@/services/assessmentFileService";
import { assignRequestService } from "@/services/assignRequestService";
import { PaperClipOutlined, FileTextOutlined, BookOutlined } from "@ant-design/icons";
import { useQuery, useQueries } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import styles from "./RequirementModal.module.css";

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
          className={styles.requirementHeading}
        >
          {item.content}
        </Title>
      );
    case "paragraph":
      return (
        <Paragraph key={index} className={styles.requirementParagraph}>
          {item.content}
        </Paragraph>
      );
    case "image":
      return (
        <AntImage
          key={index}
          src={item.src}
          alt="Requirement content"
          className={styles.requirementImage}
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <FileTextOutlined style={{ fontSize: 24, color: "#49BBBD" }} />
          <span>{title}</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={
        <AntButton className={styles.closeButton} onClick={onCancel}>
          Close
        </AntButton>
      }
      width={1200}
      className={styles.modalWrapper}
      style={{ top: 20 }}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <div className={styles.modalBody}>
          {templateDescription && (
            <div className={styles.section}>
              <Title level={5} className={styles.sectionTitle}>
                <BookOutlined /> Description
              </Title>
              <Paragraph className={styles.descriptionText}>
                {templateDescription}
              </Paragraph>
            </div>
          )}

          {templateDescription && (files.filter(f => f.fileTemplate !== 1).length > 0 || content.length > 0 || papers.length > 0) && (
            <Divider className={styles.divider} />
          )}

          {files.filter(f => f.fileTemplate !== 1).length > 0 && (
            <div className={styles.section}>
              <Title level={5} className={styles.sectionTitle}>
                <PaperClipOutlined /> Requirement Files
              </Title>
              <List
                className={styles.fileList}
                dataSource={files.filter(f => f.fileTemplate !== 1)}
                renderItem={(file) => (
                  <List.Item>
                    <a
                      href={file.fileUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.fileLink}
                    >
                      <PaperClipOutlined className={styles.fileIcon} />
                      {file.name}
                    </a>
                  </List.Item>
                )}
              />
            </div>
          )}

          {files.filter(f => f.fileTemplate !== 1).length > 0 && (content.length > 0 || papers.length > 0) && (
            <Divider className={styles.divider} />
          )}

          {content && content.length > 0 && (
            <div className={styles.section}>
              <Title level={5} className={styles.sectionTitle}>
                <FileTextOutlined /> Requirements
              </Title>
              <div className={styles.requirementContent}>
                {content.map(renderRequirementContent)}
              </div>
            </div>
          )}

          {content.length > 0 && papers.length > 0 && (
            <Divider className={styles.divider} />
          )}

          {papers.length > 0 && (
            <div className={styles.section}>
              <Title level={5} className={styles.sectionTitle}>
                <BookOutlined /> Exam Papers & Questions
              </Title>
              <Collapse
                className={styles.paperCollapse}
                expandIconPosition="end"
                items={papers.map((paper, paperIndex) => ({
                  key: paper.id.toString(),
                  label: (
                    <div className={styles.paperLabel}>
                      <span className={styles.paperName}>
                        Paper {paperIndex + 1}: {paper.name}
                      </span>
                    </div>
                  ),
                  children: (
                    <div>
                      {paper.description && (
                        <div style={{ 
                          marginBottom: 24,
                          padding: "20px 24px",
                          background: "#f8f9fa",
                          borderRadius: "12px",
                          borderLeft: "4px solid #49BBBD"
                        }}>
                          <Text strong style={{ 
                            display: "block", 
                            marginBottom: 12,
                            color: "#2F327D",
                            fontSize: 15
                          }}>
                            Paper Description:
                          </Text>
                          <div style={{
                            color: "#434343",
                            lineHeight: 1.8,
                            fontSize: 15,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word"
                          }}>
                            {paper.description}
                          </div>
                        </div>
                      )}
                      {questions[paper.id]?.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((question, qIndex) => (
                        <div key={question.id} className={styles.questionCard}>
                          <div className={styles.questionHeader}>
                            <Title level={5} className={styles.questionTitle}>
                              Question {qIndex + 1}
                            </Title>
                            <span className={styles.questionScore}>
                              Score: {question.score}
                            </span>
                          </div>
                          <div className={styles.questionText}>
                            {question.questionText}
                          </div>

                          {question.questionSampleInput && (
                            <div className={styles.sampleSection}>
                              <span className={styles.sampleLabel}>Sample Input:</span>
                              <pre className={styles.sampleCode}>
                                {question.questionSampleInput}
                              </pre>
                            </div>
                          )}

                          {question.questionSampleOutput && (
                            <div className={styles.sampleSection}>
                              <span className={styles.sampleLabel}>Sample Output:</span>
                              <pre className={styles.sampleCode}>
                                {question.questionSampleOutput}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ),
                }))}
              />
            </div>
          )}

          {!templateDescription && files.filter(f => f.fileTemplate !== 1).length === 0 && content.length === 0 && papers.length === 0 && (
            <div className={styles.emptyState}>
              <Text className={styles.emptyStateText}>No requirement details available.</Text>
            </div>
          )}
        </div>
      </Spin>
    </Modal>
  );
};
