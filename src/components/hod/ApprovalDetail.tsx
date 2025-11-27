"use client";

import { useState, useEffect } from "react";
import type { CollapseProps } from "antd";
import { Alert, App, Collapse, Divider, Input, List, Space, Spin, Tag, Typography } from "antd";
import { DownloadOutlined, PaperClipOutlined } from "@ant-design/icons";
import { Button } from "../ui/Button";
import styles from "./ApprovalDetail.module.css";
import { adminService } from "@/services/adminService";
import {
  ApiApprovalItem,
  ApiAssessmentTemplate,
  ApiAssignRequestUpdatePayload,
} from "@/types";
import { useRouter } from "next/navigation";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService, AssessmentQuestion } from "@/services/assessmentQuestionService";
import { rubricItemService, RubricItem } from "@/services/rubricItemService";
import { assessmentFileService } from "@/services/assessmentFileService";

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

interface ApprovalDetailProps {
  template: ApiAssessmentTemplate;
  approvalItem: ApiApprovalItem;
}

const getStatusProps = (status: number) => {
  switch (status) {
    case 1: // PENDING
      return { color: "warning", text: "Pending" };
    case 2: // ACCEPTED
      return { color: "processing", text: "Accepted" };
    case 3: // REJECTED
      return { color: "error", text: "Rejected" };
    case 4: // IN_PROGRESS
      return { color: "processing", text: "In Progress" };
    case 5: // COMPLETED (coi là Approved)
      return { color: "success", text: "Approved" };
    default:
      return { color: "default", text: `Unknown (${status})` };
  }
};

export default function ApprovalDetail({
  template,
  approvalItem,
}: ApprovalDetailProps) {
  const router = useRouter();
  const { message: antMessage } = App.useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(approvalItem.status);
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<{ [paperId: number]: AssessmentQuestion[] }>({});
  const [rubrics, setRubrics] = useState<{ [questionId: number]: RubricItem[] }>({});
  const [files, setFiles] = useState<any[]>([]);

  const [rejectReasonVisibleForItem, setRejectReasonVisibleForItem] = useState<
    string | null
  >(null);
  const [rejectReason, setRejectReason] = useState("");
  const [outerActiveKeys, setOuterActiveKeys] = useState<string | string[]>([]);

  // Fetch papers, questions, rubrics, and files from API
  useEffect(() => {
    const fetchRequirementData = async () => {
      try {
        setLoading(true);

        // Fetch assessment files
        try {
          const filesRes = await assessmentFileService.getFilesForTemplate({
            assessmentTemplateId: template.id,
            pageNumber: 1,
            pageSize: 1000,
          });
          setFiles(filesRes.items || []);
        } catch (err) {
          console.error("Failed to fetch assessment files:", err);
          setFiles([]);
        }

        // Fetch papers
        const papersRes = await assessmentPaperService.getAssessmentPapers({
          assessmentTemplateId: template.id,
          pageNumber: 1,
          pageSize: 100,
        });
        const papersData = papersRes.items.length > 0 ? papersRes.items : [];
        setPapers(papersData);

        if (papersData.length > 0) {
          setOuterActiveKeys([`paper-${papersData[0].id}`]);
        }

        // Fetch questions and rubrics for each paper
        const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
        const rubricsMap: { [questionId: number]: RubricItem[] } = {};

        for (const paper of papersData) {
          try {
            const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
              assessmentPaperId: paper.id,
              pageNumber: 1,
              pageSize: 100,
            });
            const sortedQuestions = [...questionsRes.items].sort((a, b) => 
              (a.questionNumber || 0) - (b.questionNumber || 0)
            );
            questionsMap[paper.id] = sortedQuestions;

            // Fetch rubrics for each question
            for (const question of sortedQuestions) {
              try {
                const rubricsRes = await rubricItemService.getRubricsForQuestion({
                  assessmentQuestionId: question.id,
                  pageNumber: 1,
                  pageSize: 100,
                });
                rubricsMap[question.id] = rubricsRes.items || [];
              } catch (err) {
                console.error(`Failed to fetch rubrics for question ${question.id}:`, err);
                rubricsMap[question.id] = [];
              }
            }
          } catch (err) {
            console.error(`Failed to fetch questions for paper ${paper.id}:`, err);
            questionsMap[paper.id] = [];
          }
        }

        setQuestions(questionsMap);
        setRubrics(rubricsMap);
      } catch (err: any) {
        console.error("Failed to fetch requirement data:", err);
        antMessage.error("Failed to load requirement data");
      } finally {
        setLoading(false);
      }
    };

    fetchRequirementData();
  }, [template.id, antMessage]);

  const createPayload = (
    status: number,
    message: string
  ): ApiAssignRequestUpdatePayload => {
    return {
      message: message,
      courseElementId: approvalItem.courseElementId,
      assignedLecturerId: approvalItem.assignedLecturerId,
      assignedByHODId: approvalItem.assignedByHODId,
      status: status,
      assignedAt: approvalItem.assignedAt,
    };
  };

  // Xử lý Approve
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const payload = createPayload(5, "Approved by HOD");
      await adminService.updateAssignRequestStatus(approvalItem.id, payload);

      setCurrentStatus(5);
      setRejectReasonVisibleForItem(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý Reject
  const handleRejectClick = async () => {
    if (rejectReasonVisibleForItem === null) {
      setRejectReasonVisibleForItem(`paper-${template.papers[0].id}`);
      return;
    }

    if (!rejectReason.trim()) {
      antMessage.error("Please enter a reject reason.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = createPayload(3, rejectReason);
      await adminService.updateAssignRequestStatus(approvalItem.id, payload);

      setCurrentStatus(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isActionDisabled =
    isSubmitting || currentStatus === 3 || currentStatus === 5;
  const statusInfo = getStatusProps(currentStatus);

  // Calculate total score from all rubrics
  const calculateTotalScore = () => {
    let total = 0;
    Object.values(questions).forEach((paperQuestions) => {
      paperQuestions.forEach((question) => {
        const questionRubrics = rubrics[question.id] || [];
        const questionTotal = questionRubrics.reduce((sum, rubric) => sum + (rubric.score || 0), 0);
        total += questionTotal;
      });
    });
    return total;
  };

  const totalScore = calculateTotalScore();

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <Alert
        message="Error"
        description="This template has no papers."
        type="error"
        showIcon
      />
    );
  }

  const courseCollapseItems: CollapseProps["items"] = papers.map((paper, paperIndex) => {
  const paperKey = `paper-${paper.id}`;
    const paperQuestions = questions[paper.id] || [];

    return {
      key: paperKey,
      label: (
        <div className={styles.mainPanelHeader}>
          <Title level={4} style={{ margin: 0 }}>
            Paper {paperIndex + 1}: {paper.name}
            {paper.description && (
              <Text type="secondary" style={{ marginLeft: 8 }}>
                - {paper.description}
              </Text>
            )}
          </Title>
          <Space>
            <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
            <Tag color="blue">{template.lecturerName}</Tag>
            <Text type="secondary">{paperQuestions.length} Questions</Text>
          </Space>
        </div>
      ),
      children: (
        <div style={{ padding: "0 24px" }}>
          {/* Template Description */}
          {template.description && (
            <>
              <Title level={5}>Description</Title>
              <Text>{template.description}</Text>
              <Divider />
            </>
          )}

          {/* Requirement Files */}
          {files.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Title level={5} style={{ margin: 0 }}>Requirement Files</Title>
                {files.length > 1 && (
                  <Button
                    icon={<DownloadOutlined />}
                    size="small"
                    onClick={async () => {
                      try {
                        antMessage.loading("Downloading files...", 0);
                        for (const file of files) {
                          try {
                            const response = await fetch(file.fileUrl);
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = file.name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                              // Small delay between downloads
                              await new Promise(resolve => setTimeout(resolve, 200));
                            }
                          } catch (err) {
                            console.error(`Failed to download file ${file.name}:`, err);
                          }
                        }
                        antMessage.destroy();
                        antMessage.success(`Downloaded ${files.length} file(s)`);
                      } catch (err) {
                        antMessage.destroy();
                        antMessage.error("Failed to download files");
                      }
                    }}
                  >
                    Download All
                  </Button>
                )}
              </div>
              <List
                dataSource={files}
                renderItem={(file) => (
                  <List.Item>
                    <a
                      href={file.fileUrl}
                      download={file.name}
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const response = await fetch(file.fileUrl);
                          if (response.ok) {
                            const blob = await response.blob();
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = file.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          } else {
                            antMessage.error(`Failed to download ${file.name}`);
                          }
                        } catch (err) {
                          console.error(`Failed to download file ${file.name}:`, err);
                          antMessage.error(`Failed to download ${file.name}`);
                        }
                      }}
                      style={{ cursor: "pointer" }}
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

          {/* Questions */}
          {paperQuestions.length > 0 ? (
            <div>
              {paperQuestions.map((question, qIndex) => (
                <div key={question.id} style={{ marginBottom: 24 }}>
                  <Title level={5}>
                    Question {question.questionNumber || qIndex + 1} (Score: {question.score || 0})
                  </Title>
                  <Text>{question.questionText}</Text>

                  {question.questionSampleInput && (
                    <div style={{ marginTop: 12 }}>
                      <Text strong>Sample Input:</Text>
                      <pre style={{ background: "#f5f5f5", padding: 8, borderRadius: 4, marginTop: 4 }}>
                        {question.questionSampleInput}
                      </pre>
                    </div>
                  )}

                  {question.questionSampleOutput && (
                    <div style={{ marginTop: 12 }}>
                      <Text strong>Sample Output:</Text>
                      <pre style={{ background: "#f5f5f5", padding: 8, borderRadius: 4, marginTop: 4 }}>
                        {question.questionSampleOutput}
                      </pre>
                    </div>
                  )}

                  {rubrics[question.id] && rubrics[question.id].length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <Text strong>Grading Criteria:</Text>
                      <ul style={{ marginTop: 8 }}>
                        {rubrics[question.id].map((rubric) => (
                          <li key={rubric.id} style={{ marginBottom: 8 }}>
                            {rubric.description} (Max: {rubric.score} points)
                            {rubric.input && rubric.input !== "N/A" && (
                              <div style={{ marginLeft: 20, fontSize: "12px", color: "#666", marginTop: 4 }}>
                                Input: <code>{rubric.input}</code>
                              </div>
                            )}
                            {rubric.output && rubric.output !== "N/A" && (
                              <div style={{ marginLeft: 20, fontSize: "12px", color: "#666", marginTop: 4 }}>
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
          ) : (
            <Text type="secondary">No questions found for this paper.</Text>
          )}

          <div className={styles.actionArea} style={{ marginTop: 24 }}>
            {rejectReasonVisibleForItem === paperKey && (
              <TextArea
                rows={3}
                placeholder="Enter reject reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className={styles.rejectReasonInput}
                disabled={isActionDisabled}
                style={{ marginBottom: 16 }}
              />
            )}
            <Space className={styles.actionButtons}>
              <Button
                variant="primary"
                size="large"
                className={styles.approveButton}
                onClick={handleApprove}
                loading={isSubmitting}
                disabled={isActionDisabled}
              >
                {currentStatus === 5 ? "Approved" : "Approve"}
              </Button>
              <Button
                variant="danger"
                size="large"
                className={styles.rejectButton}
                onClick={() => {
                  if (rejectReasonVisibleForItem === paperKey) {
                    handleRejectClick();
                  } else {
                    setRejectReasonVisibleForItem(paperKey);
                  }
                }}
                loading={isSubmitting}
                disabled={isActionDisabled}
              >
                {currentStatus === 3
                  ? "Rejected"
                  : rejectReasonVisibleForItem === paperKey
                  ? "Confirm Reject"
                  : "Reject"}
              </Button>
            </Space>
          </div>
        </div>
      ),
      className: styles.mainPanel,
    };
  });

  return (
    <div className={styles.wrapper}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
      <Title
        level={2}
        style={{
          fontWeight: 700,
          color: "#2F327D",
            margin: 0,
        }}
      >
        Approval Detail: {template.name}
      </Title>
        {totalScore > 0 && (
          <Tag color="blue" style={{ fontSize: "16px", padding: "4px 12px" }}>
            Total Score: {totalScore} points
          </Tag>
        )}
      </div>

      <Collapse
        activeKey={outerActiveKeys}
        onChange={(keys) => setOuterActiveKeys(keys)}
        bordered={false}
        className={styles.mainCollapse}
        items={courseCollapseItems}
      />
    </div>
  );
}
