// Tên file: components/AssignmentList/RequirementModal.tsx
"use client";

import React, { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<{ [paperId: number]: AssessmentQuestion[] }>({});
  const [files, setFiles] = useState<any[]>([]);
  const [templateDescription, setTemplateDescription] = useState<string>("");

  useEffect(() => {
    if (open && (propAssessmentTemplateId || classAssessmentId || courseElementId || examSessionId)) {
      fetchRequirementData();
    }
  }, [open, classAssessmentId, classId, propAssessmentTemplateId, courseElementId, examSessionId]);

  const fetchRequirementData = async () => {
    try {
      setLoading(true);

      let assessmentTemplateId: number | null = null;

      // First, try to use assessmentTemplateId from props if available
      if (propAssessmentTemplateId) {
        assessmentTemplateId = propAssessmentTemplateId;
        console.log("RequirementModal: Using assessmentTemplateId from props:", assessmentTemplateId);
      }

      // Try to get assessmentTemplateId from classAssessmentId
      if (classAssessmentId && classId) {
        try {
          // First try with classId from props
          const classAssessmentsRes = await classAssessmentService.getClassAssessments({
            classId: classId,
            pageNumber: 1,
            pageSize: 1000,
          });
          const classAssessment = classAssessmentsRes.items.find(
            (ca) => ca.id === classAssessmentId
          );
          if (classAssessment?.assessmentTemplateId) {
            assessmentTemplateId = classAssessment.assessmentTemplateId;
            console.log("RequirementModal: Found assessmentTemplateId from classAssessment:", assessmentTemplateId);
          }

          // If not found, try to fetch all class assessments
          if (!assessmentTemplateId) {
            try {
              const allClassAssessmentsRes = await classAssessmentService.getClassAssessments({
                pageNumber: 1,
                pageSize: 10000,
              });
              const classAssessment = allClassAssessmentsRes.items.find(
                (ca) => ca.id === classAssessmentId
              );
              if (classAssessment?.assessmentTemplateId) {
                assessmentTemplateId = classAssessment.assessmentTemplateId;
                console.log("RequirementModal: Found assessmentTemplateId from all class assessments:", assessmentTemplateId);
              }
            } catch (err) {
              console.error("RequirementModal: Failed to fetch all class assessments:", err);
            }
          }
        } catch (err) {
          console.error("RequirementModal: Failed to fetch from classAssessment:", err);
        }
      }

      // If still not found, try to get from localStorage classId
      if (!assessmentTemplateId && classAssessmentId) {
        try {
          const localStorageClassId = localStorage.getItem("selectedClassId");
          if (localStorageClassId && localStorageClassId !== classId?.toString()) {
            const classAssessmentsRes = await classAssessmentService.getClassAssessments({
              classId: Number(localStorageClassId),
              pageNumber: 1,
              pageSize: 1000,
            });
            const classAssessment = classAssessmentsRes.items.find(
              (ca) => ca.id === classAssessmentId
            );
            if (classAssessment?.assessmentTemplateId) {
              assessmentTemplateId = classAssessment.assessmentTemplateId;
              console.log("RequirementModal: Found assessmentTemplateId from localStorage classId:", assessmentTemplateId);
            }
          }
        } catch (err) {
          console.error("RequirementModal: Failed to fetch from localStorage classId:", err);
        }
      }

      // Note: examSessionId is no longer used to fetch templates
      // Templates are now fetched via classAssessmentId or courseElementId

      // Try to get assessmentTemplateId from courseElementId via classAssessment
      if (!assessmentTemplateId && courseElementId) {
        try {
          const localStorageClassId = localStorage.getItem("selectedClassId");
          if (localStorageClassId) {
            const classAssessmentsRes = await classAssessmentService.getClassAssessments({
              classId: Number(localStorageClassId),
              pageNumber: 1,
              pageSize: 1000,
            });
            const classAssessment = classAssessmentsRes.items.find(
              (ca) => ca.courseElementId === courseElementId
            );
            if (classAssessment?.assessmentTemplateId) {
              assessmentTemplateId = classAssessment.assessmentTemplateId;
              console.log("RequirementModal: Found assessmentTemplateId from courseElementId:", assessmentTemplateId);
            }
          }
        } catch (err) {
          console.error("RequirementModal: Failed to fetch from courseElementId:", err);
        }
      }

      if (!assessmentTemplateId) {
        console.warn("RequirementModal: Could not find assessmentTemplateId. Props:", {
          propAssessmentTemplateId,
          classAssessmentId,
          classId,
          courseElementId,
          examSessionId,
        });
        setLoading(false);
        return;
      }

      const finalAssessmentTemplateId = assessmentTemplateId;

      // Fetch approved assign requests (status = 5)
      let approvedAssignRequestIds = new Set<number>();
      try {
        const assignRequestResponse = await assignRequestService.getAssignRequests({
          pageNumber: 1,
          pageSize: 1000,
        });
        // Only include assign requests with status = 5 (Approved/COMPLETED)
        const approvedAssignRequests = assignRequestResponse.items.filter(ar => ar.status === 5);
        approvedAssignRequestIds = new Set(approvedAssignRequests.map(ar => ar.id));
      } catch (err) {
        console.error("RequirementModal: Failed to fetch assign requests:", err);
        // Continue without filtering if assign requests cannot be fetched
      }

      // Fetch template and verify it has an approved assign request
      const templates = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      
      // Only get template if it has an approved assign request (status = 5)
      const template = templates.items.find((t) => {
        if (t.id !== finalAssessmentTemplateId) {
          return false;
        }
        // Check if template has assignRequestId and it's in approved assign requests
        if (!t.assignRequestId) {
          return false; // Skip templates without assignRequestId
        }
        return approvedAssignRequestIds.has(t.assignRequestId);
      });
      
      if (template) {
        setTemplateDescription(template.description || "");
      } else {
        // Template not found or not approved - don't show template data
        console.warn("RequirementModal: Template not found or not approved:", finalAssessmentTemplateId);
        setTemplateDescription("");
        setPapers([]);
        setQuestions({});
        setFiles([]);
        setLoading(false);
        return;
      }

      // Fetch files
      try {
        const filesRes = await assessmentFileService.getFilesForTemplate({
          assessmentTemplateId: finalAssessmentTemplateId,
          pageNumber: 1,
          pageSize: 100,
        });
        setFiles(filesRes.items);
      } catch (err) {
        console.error("Failed to fetch files:", err);
      }

      // Fetch papers
      let papersData: any[] = [];
      try {
        const papersRes = await assessmentPaperService.getAssessmentPapers({
          assessmentTemplateId: finalAssessmentTemplateId,
          pageNumber: 1,
          pageSize: 100,
        });
        papersData = papersRes.items || [];
        console.log("RequirementModal: Fetched papers:", papersData.length);
      } catch (err) {
        console.error("RequirementModal: Failed to fetch papers:", err);
        papersData = [];
      }
      setPapers(papersData);

      // Fetch questions for each paper
      const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
      for (const paper of papersData) {
        try {
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
          console.log(`RequirementModal: Fetched ${sortedQuestions.length} questions for paper ${paper.id}`);
        } catch (err) {
          console.error(`RequirementModal: Failed to fetch questions for paper ${paper.id}:`, err);
          questionsMap[paper.id] = [];
        }
      }
      setQuestions(questionsMap);
    } catch (err) {
      console.error("Failed to fetch requirement data:", err);
    } finally {
      setLoading(false);
    }
  };


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

          {/* Original Content */}
          {content && content.length > 0 && (
            <>
              <Title level={5}>Requirements</Title>
              {content.map(renderRequirementContent)}
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
