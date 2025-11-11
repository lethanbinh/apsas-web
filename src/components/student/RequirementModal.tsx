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
import { PaperClipOutlined } from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

interface RequirementModalProps {
  open: boolean;
  onCancel: () => void;
  title: string;
  content: RequirementContent[];
  classAssessmentId?: number;
  classId?: number;
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
}) => {
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<{ [paperId: number]: AssessmentQuestion[] }>({});
  const [files, setFiles] = useState<any[]>([]);
  const [templateDescription, setTemplateDescription] = useState<string>("");

  useEffect(() => {
    if (open && classAssessmentId && classId) {
      fetchRequirementData();
    }
  }, [open, classAssessmentId, classId]);

  const fetchRequirementData = async () => {
    try {
      setLoading(true);

      // Get assessmentTemplateId from classAssessment
      const classAssessmentsRes = await classAssessmentService.getClassAssessments({
        classId: classId,
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

      const assessmentTemplateId = classAssessment.assessmentTemplateId;

      // Fetch template
      const templates = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      const template = templates.items.find((t) => t.id === assessmentTemplateId);
      
      if (template) {
        setTemplateDescription(template.description || "");
      }

      // Fetch files
      try {
        const filesRes = await assessmentFileService.getFilesForTemplate({
          assessmentTemplateId: assessmentTemplateId,
          pageNumber: 1,
          pageSize: 100,
        });
        setFiles(filesRes.items);
      } catch (err) {
        console.error("Failed to fetch files:", err);
      }

      // Fetch papers
      const papersRes = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: assessmentTemplateId,
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
        questionsMap[paper.id] = questionsRes.items;
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
                      {questions[paper.id]?.map((question, qIndex) => (
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
