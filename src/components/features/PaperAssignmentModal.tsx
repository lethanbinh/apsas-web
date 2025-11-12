"use client";

import React, { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<{ [paperId: number]: AssessmentQuestion[] }>({});
  const [rubrics, setRubrics] = useState<{ [questionId: number]: RubricItem[] }>({});
  const [files, setFiles] = useState<any[]>([]);
  const [templateDescription, setTemplateDescription] = useState<string>("");
  const [assessmentTemplateId, setAssessmentTemplateId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (template?.id) {
        setAssessmentTemplateId(template.id);
        fetchRequirementData(template.id);
      } else if (classAssessmentId && classId) {
        fetchRequirementDataFromClassAssessment();
      }
    }
  }, [isOpen, template, classAssessmentId, classId]);

  const fetchRequirementDataFromClassAssessment = async () => {
    try {
      setLoading(true);

      // Get assessmentTemplateId from classAssessment
      const classAssessmentsRes = await classAssessmentService.getClassAssessments({
        classId: classId!,
        pageNumber: 1,
        pageSize: 1000,
      });
      const classAssessment = classAssessmentsRes.items.find(
        (ca) => ca.id === classAssessmentId
      );

      if (!classAssessment?.assessmentTemplateId) {
        setLoading(false);
        return;
      }

      const templateId = classAssessment.assessmentTemplateId;
      setAssessmentTemplateId(templateId);
      await fetchRequirementData(templateId);
    } catch (err) {
      console.error("Failed to fetch requirement data:", err);
      setLoading(false);
    }
  };

  const fetchRequirementData = async (templateId: number) => {
    try {
      setLoading(true);

      // Fetch template
      const templates = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      const templateData = templates.items.find((t) => t.id === templateId);
      
      if (templateData) {
        setTemplateDescription(templateData.description || "");
      }

      // Fetch files
      try {
        const filesRes = await assessmentFileService.getFilesForTemplate({
          assessmentTemplateId: templateId,
          pageNumber: 1,
          pageSize: 100,
        });
        setFiles(filesRes.items);
      } catch (err) {
        console.error("Failed to fetch files:", err);
      }

      // Fetch papers
      const papersRes = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: templateId,
        pageNumber: 1,
        pageSize: 100,
      });
      setPapers(papersRes.items);

      // Fetch questions for each paper
      const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
      for (const paper of papersRes.items) {
        const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
          assessmentPaperId: paper.id,
          pageNumber: 1,
          pageSize: 100,
        });
        // Sort questions by questionNumber
        const sortedQuestions = [...questionsRes.items].sort((a, b) => 
          (a.questionNumber || 0) - (b.questionNumber || 0)
        );
        questionsMap[paper.id] = sortedQuestions;

        // Fetch rubrics for each question (LECTURER CAN SEE RUBRICS)
        const rubricsMap: { [questionId: number]: RubricItem[] } = {};
        for (const question of questionsRes.items) {
          const rubricsRes = await rubricItemService.getRubricsForQuestion({
            assessmentQuestionId: question.id,
            pageNumber: 1,
            pageSize: 100,
          });
          rubricsMap[question.id] = rubricsRes.items;
        }
        setRubrics((prev) => ({ ...prev, ...rubricsMap }));
      }
      setQuestions(questionsMap);
    } catch (err) {
      console.error("Failed to fetch requirement data:", err);
    } finally {
      setLoading(false);
    }
  };

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
          {template?.name || "Assignment Paper"}
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
          {/* Template Description */}
          {templateDescription && (
            <>
              <Title level={5}>Description</Title>
              <Paragraph>{templateDescription}</Paragraph>
              <Divider />
            </>
          )}

          {/* Requirement Files */}
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

          {/* Papers, Questions, and Rubrics */}
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

                          {/* LECTURER CAN SEE RUBRICS/CRITERIA */}
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
