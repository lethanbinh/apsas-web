"use client";

import { useState, useEffect } from "react";
import type { CollapseProps } from "antd";
import { Alert, App, Button as AntButton, Collapse, Divider, Input, List, Space, Spin, Tag, Typography } from "antd";
import { ArrowLeftOutlined, DownloadOutlined, PaperClipOutlined, CloseOutlined, CheckCircleOutlined, CloseCircleOutlined, VerticalAlignTopOutlined } from "@ant-design/icons";
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
import { assessmentQuestionService, AssessmentQuestion, UpdateAssessmentQuestionPayload } from "@/services/assessmentQuestionService";
import { rubricItemService, RubricItem } from "@/services/rubricItemService";
import { assessmentFileService } from "@/services/assessmentFileService";
import { QuestionCommentModal } from "../hod/QuestionCommentModal";
import { useAuth } from "@/hooks/useAuth";
import { CommentOutlined, EditOutlined } from "@ant-design/icons";

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

export default function LecturerApprovalDetail({
  template,
  approvalItem,
}: ApprovalDetailProps) {
  const router = useRouter();
  const { message: antMessage, modal } = App.useApp();
  const { user } = useAuth();

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
  const [questionComments, setQuestionComments] = useState<{ [questionId: number]: string }>({});
  const [isUpdatingComments, setIsUpdatingComments] = useState(false);
  const [selectedQuestionForComment, setSelectedQuestionForComment] = useState<AssessmentQuestion | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollTop(scrollTop > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
        const commentsMap: { [questionId: number]: string } = {};

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
            
            // Load existing comments
            sortedQuestions.forEach(q => {
              if (q.reviewerComment) {
                commentsMap[q.id] = q.reviewerComment;
              }
            });
            
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
        setQuestionComments(commentsMap);
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
      assignedApproverLecturerId: approvalItem.assignedApproverLecturerId ?? 0,
      status: status,
      assignedAt: approvalItem.assignedAt,
    };
  };

  // Xử lý Approve
  const handleApprove = () => {
    modal.confirm({
      title: "Confirm Approval",
      content: "Are you sure you want to approve this assessment template?",
      okText: "Yes, Approve",
      okType: "primary",
      cancelText: "Cancel",
      onOk: async () => {
        setIsSubmitting(true);
        try {
          const payload = createPayload(5, "Approved by Approver Lecturer");
          await adminService.updateAssignRequestStatus(approvalItem.id, payload);

          setCurrentStatus(5);
          setRejectReasonVisibleForItem(null);
          antMessage.success("Request approved successfully");
        } catch (err: any) {
          console.error("Failed to approve:", err);
          antMessage.error(err.message || "Failed to approve request");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  // Handle opening comment modal
  const handleOpenCommentModal = (question: AssessmentQuestion) => {
    setSelectedQuestionForComment(question);
    setIsCommentModalOpen(true);
  };

  // Handle comment update success
  const handleCommentUpdateSuccess = () => {
    if (!selectedQuestionForComment) return;
    
    // Refresh questions to get updated comments
    const refreshQuestions = async () => {
      try {
        const papersRes = await assessmentPaperService.getAssessmentPapers({
          assessmentTemplateId: template.id,
          pageNumber: 1,
          pageSize: 100,
        });
        const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
        const commentsMap: { [questionId: number]: string } = {};

        for (const paper of papersRes.items) {
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
            
            sortedQuestions.forEach(q => {
              if (q.reviewerComment) {
                commentsMap[q.id] = q.reviewerComment;
              }
            });
          } catch (err) {
            console.error(`Failed to fetch questions for paper ${paper.id}:`, err);
          }
        }

        setQuestions(questionsMap);
        setQuestionComments(commentsMap);
      } catch (err) {
        console.error("Failed to refresh questions:", err);
      }
    };

    refreshQuestions();
  };

  // Xử lý Reject
  const handleRejectClick = () => {
    if (!rejectReasonVisibleForItem) {
      // Set reject reason visible for the first paper if not set
      const firstPaperKey = papers.length > 0 ? `paper-${papers[0].id}` : null;
      if (firstPaperKey) {
        setRejectReasonVisibleForItem(firstPaperKey);
      }
      return;
    }

    if (!rejectReason.trim()) {
      antMessage.error("Please enter a reject reason.");
      return;
    }

    // Check if at least one question has a comment
    const allQuestions = Object.values(questions).flat();
    const questionsWithComments = allQuestions.filter(
      q => questionComments[q.id] && questionComments[q.id].trim()
    );

    if (questionsWithComments.length === 0) {
      antMessage.error("Please provide comments for at least one question before rejecting.");
      return;
    }

    modal.confirm({
      title: "Confirm Rejection",
      content: "Are you sure you want to reject this assessment template? This action will reject the request with the comments you provided.",
      okText: "Yes, Reject",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        setIsSubmitting(true);
        try {
          // Update all question comments first
          for (const question of allQuestions) {
            const comment = questionComments[question.id]?.trim();
            if (comment) {
              const updatePayload: UpdateAssessmentQuestionPayload = {
                questionText: question.questionText,
                questionSampleInput: question.questionSampleInput,
                questionSampleOutput: question.questionSampleOutput,
                score: question.score,
                questionNumber: question.questionNumber,
                reviewerComment: comment,
              };
              await assessmentQuestionService.updateAssessmentQuestion(question.id, updatePayload);
            }
          }

          // Then update the assign request status
          const payload = createPayload(3, rejectReason);
          await adminService.updateAssignRequestStatus(approvalItem.id, payload);

          setCurrentStatus(3);
          setRejectReasonVisibleForItem(null);
          antMessage.success("Request rejected with comments");
        } catch (err: any) {
          console.error("Failed to reject:", err);
          antMessage.error(err.message || "Failed to reject request");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const isActionDisabled =
    isSubmitting || currentStatus === 3 || currentStatus === 5;
  const statusInfo = getStatusProps(currentStatus);
  const isRejected = currentStatus === 3;
  
  // Helper to check if can comment for a specific paper
  const canCommentForPaper = (paperKey: string) => {
    return isRejected || rejectReasonVisibleForItem === paperKey;
  };

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

                  {/* Reviewer Comment Section - Always show if there's a comment, or if can comment */}
                  {(question.reviewerComment || canCommentForPaper(paperKey)) && (
                    <div style={{ 
                      marginTop: 16, 
                      padding: "16px", 
                      backgroundColor: "#e6f4ff", 
                      borderRadius: "8px", 
                      border: "1px solid #91caff",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <Text strong style={{ color: "#0958d9", fontSize: "14px" }}>
                          Reviewer Comment:
                        </Text>
                        {canCommentForPaper(paperKey) && (
                          <Button
                            variant="primary"
                            size="small"
                            icon={question.reviewerComment ? <EditOutlined /> : <CommentOutlined />}
                            onClick={() => handleOpenCommentModal(question)}
                            disabled={isActionDisabled && !isRejected}
                            style={{
                              backgroundColor: question.reviewerComment ? "#0958d9" : "#1890ff",
                              borderColor: question.reviewerComment ? "#0958d9" : "#1890ff",
                              fontWeight: 500,
                              boxShadow: "0 2px 4px rgba(9, 88, 217, 0.2)",
                            }}
                          >
                            {question.reviewerComment ? "Edit Comment" : "Add Comment"}
                          </Button>
                        )}
                      </div>
                      {question.reviewerComment ? (
                        <div>
                          <div style={{ 
                            padding: "12px", 
                            backgroundColor: "#fff", 
                            borderRadius: "6px", 
                            border: "1px solid #91caff",
                            boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.04)",
                            marginBottom: "8px"
                          }}>
                            <Text style={{ color: "#1d39c4", lineHeight: "1.6" }}>{question.reviewerComment}</Text>
                          </div>
                          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#69b1ff" }}>
                            <Text type="secondary" style={{ fontSize: "12px" }}>
                              <Text strong style={{ color: "#0958d9" }}>Commented by:</Text> {approvalItem.assignedApproverLecturerName || user?.fullName || "Unknown"}
                            </Text>
                            {question.updatedAt && (
                              <Text type="secondary" style={{ fontSize: "12px" }}>
                                <Text strong style={{ color: "#0958d9" }}>Date:</Text> {new Date(question.updatedAt).toLocaleDateString("en-US", { 
                                  year: "numeric", 
                                  month: "short", 
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </Text>
                            )}
                          </div>
                        </div>
                      ) : canCommentForPaper(paperKey) ? (
                        <Text type="secondary" style={{ fontStyle: "italic", color: "#69b1ff" }}>
                          No comment provided yet.
                        </Text>
                      ) : null}
                    </div>
                  )}

                  <Divider />
                </div>
              ))}
            </div>
          ) : (
            <Text type="secondary">No questions found for this paper.</Text>
          )}

        </div>
      ),
      className: styles.mainPanel,
    };
  });

  return (
    <div className={styles.wrapper}>
      <div style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {totalScore > 0 && (
              <Tag color="blue" style={{ fontSize: "16px", padding: "4px 12px" }}>
                Total Score: {totalScore} points
              </Tag>
            )}
            <AntButton
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/lecturer/approval")}
            >
              Back
            </AntButton>
          </div>
        </div>

        {/* Approval Actions - Beautiful Buttons */}
        <div style={{ 
          padding: "20px 24px", 
          backgroundColor: "#f8f9fa", 
          borderRadius: "12px",
          border: "1px solid #e9ecef",
          marginBottom: "24px"
        }}>
          {rejectReasonVisibleForItem && (
            <div style={{ marginBottom: "16px" }}>
              <Text strong style={{ display: "block", marginBottom: "8px", color: "#2F327D" }}>
                Reject Reason:
              </Text>
              <TextArea
                rows={4}
                placeholder="Please provide a detailed reason for rejecting this assessment template..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={isActionDisabled}
                style={{
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
            </div>
          )}
          
          <Space size="large" wrap>
            <AntButton
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={handleApprove}
              loading={isSubmitting}
              disabled={isActionDisabled || !!rejectReasonVisibleForItem}
              style={{
                height: "48px",
                paddingLeft: "32px",
                paddingRight: "32px",
                fontSize: "16px",
                fontWeight: 600,
                borderRadius: "8px",
                minWidth: "140px",
              }}
            >
              {currentStatus === 5 ? "Approved" : "Approve"}
            </AntButton>

            {rejectReasonVisibleForItem && (
              <AntButton
                size="large"
                icon={<CloseOutlined />}
                onClick={() => {
                  setRejectReasonVisibleForItem(null);
                  setRejectReason("");
                }}
                disabled={isSubmitting}
                style={{
                  height: "48px",
                  paddingLeft: "32px",
                  paddingRight: "32px",
                  fontSize: "16px",
                  fontWeight: 600,
                  borderRadius: "8px",
                  minWidth: "140px",
                }}
              >
                Cancel
              </AntButton>
            )}

            <AntButton
              danger
              type="primary"
              size="large"
              icon={<CloseCircleOutlined />}
              onClick={() => {
                if (rejectReasonVisibleForItem) {
                  handleRejectClick();
                } else {
                  // Set reject reason visible for the first paper
                  const firstPaperKey = papers.length > 0 ? `paper-${papers[0].id}` : null;
                  if (firstPaperKey) {
                    setRejectReasonVisibleForItem(firstPaperKey);
                  }
                }
              }}
              loading={isSubmitting}
              disabled={isActionDisabled}
              style={{
                height: "48px",
                paddingLeft: "32px",
                paddingRight: "32px",
                fontSize: "16px",
                fontWeight: 600,
                borderRadius: "8px",
                minWidth: "140px",
              }}
            >
              {currentStatus === 3
                ? "Rejected"
                : rejectReasonVisibleForItem
                ? "Confirm Reject"
                : "Reject"}
            </AntButton>
          </Space>
        </div>
      </div>

      <Collapse
        activeKey={outerActiveKeys}
        onChange={(keys) => setOuterActiveKeys(keys)}
        bordered={false}
        className={styles.mainCollapse}
        items={courseCollapseItems}
      />

      {/* Question Comment Modal */}
      <QuestionCommentModal
        open={isCommentModalOpen}
        onCancel={() => {
          setIsCommentModalOpen(false);
          setSelectedQuestionForComment(null);
        }}
        onSuccess={handleCommentUpdateSuccess}
        question={selectedQuestionForComment}
        isRejected={isRejected}
        disabled={isActionDisabled && !isRejected}
      />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <AntButton
          type="primary"
          shape="circle"
          size="large"
          icon={<VerticalAlignTopOutlined />}
          onClick={scrollToTop}
          style={{
            position: "fixed",
            bottom: "32px",
            right: "32px",
            width: "50px",
            height: "50px",
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(24, 144, 255, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      )}
    </div>
  );
}

