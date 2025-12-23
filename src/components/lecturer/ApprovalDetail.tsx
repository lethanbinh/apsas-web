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
  AssignRequestStatus,
} from "@/types";
import { useRouter } from "next/navigation";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService, AssessmentQuestion, UpdateAssessmentQuestionPayload } from "@/services/assessmentQuestionService";
import { rubricItemService, RubricItem } from "@/services/rubricItemService";
import { assessmentFileService } from "@/services/assessmentFileService";
import { QuestionCommentModal } from "../hod/QuestionCommentModal";
import { useAuth } from "@/hooks/useAuth";
import { CommentOutlined, EditOutlined } from "@ant-design/icons";
import { EmptyPapersState, EmptyQuestionsState, EmptyRubricsState } from "@/components/shared/EmptyState";
const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;
interface ApprovalDetailProps {
  template: ApiAssessmentTemplate;
  approvalItem: ApiApprovalItem;
}
const getStatusProps = (status: number) => {
  switch (status) {
    case 1:
      return { color: "default", text: "Pending" };
    case 2:
      return { color: "processing", text: "Accepted" };
    case 3:
      return { color: "error", text: "Rejected" };
    case 4:
      return { color: "warning", text: "In Progress" };
    case 5:
      return { color: "success", text: "Completed" };
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
  useEffect(() => {
    const fetchRequirementData = async () => {
      try {
        setLoading(true);
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
            sortedQuestions.forEach(q => {
              if (q.reviewerComment) {
                commentsMap[q.id] = q.reviewerComment;
              }
            });
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
  const handleOpenCommentModal = (question: AssessmentQuestion) => {
    setSelectedQuestionForComment(question);
    setIsCommentModalOpen(true);
  };
  const handleCommentUpdateSuccess = () => {
    if (!selectedQuestionForComment) return;
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
  const handleRejectClick = () => {
    if (!rejectReasonVisibleForItem) {
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
    isSubmitting || currentStatus !== AssignRequestStatus.ACCEPTED;
  const statusInfo = getStatusProps(currentStatus);
  const isRejected = currentStatus === AssignRequestStatus.REJECTED;
  const canCommentForPaper = (paperKey: string) => {
    return isRejected || rejectReasonVisibleForItem === paperKey;
  };
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
    return <EmptyPapersState backPath="/lecturer/approval" />;
  }
  const courseCollapseItems: CollapseProps["items"] = papers.map((paper, paperIndex) => {
  const paperKey = `paper-${paper.id}`;
    const paperQuestions = questions[paper.id] || [];
    return {
      key: paperKey,
      label: (
        <div className={styles.mainPanelHeader}>
          <Title level={4} style={{ margin: 0, wordBreak: "break-word", whiteSpace: "normal", flex: "1 1 auto", minWidth: 0 }}>
            Paper {paperIndex + 1}: {paper.name}
            {paper.description && (
              <Text type="secondary" style={{ marginLeft: 8, wordBreak: "break-word", whiteSpace: "normal", display: "block" }}>
                - {paper.description}
              </Text>
            )}
          </Title>
          <Space style={{ flexShrink: 0 }}>
            <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
            <Tag color="blue">{template.lecturerName}</Tag>
            <Text type="secondary">{paperQuestions.length} Questions</Text>
          </Space>
        </div>
      ),
      children: (
        <div className={styles.paperContent}>
          {template.description && (
            <>
              <Title level={5} className={styles.sectionTitle}>Description</Title>
              <Text className={styles.descriptionText}>{template.description}</Text>
              <Divider className={styles.divider} />
            </>
          )}
          {files.length > 0 && (
            <div className={styles.filesSection}>
              <div className={styles.filesHeader}>
                <Title level={5} className={styles.sectionTitle} style={{ margin: 0 }}>Requirement Files</Title>
                {files.length > 1 && (
                  <Button
                    icon={<DownloadOutlined />}
                    size="large"
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
                className={styles.filesList}
                dataSource={files}
                renderItem={(file) => (
                  <List.Item>
                    <a
                      href={file.fileUrl}
                      download={file.name}
                      className={styles.fileLink}
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
                    >
                      <PaperClipOutlined />
                      {file.name}
                    </a>
                  </List.Item>
                )}
              />
              <Divider className={styles.divider} />
            </div>
          )}
          {paperQuestions.length > 0 ? (
            <div>
              {paperQuestions.map((question, qIndex) => (
                <div key={question.id} className={styles.questionCard}>
                  <Title level={5} className={styles.questionTitle}>
                    Question {question.questionNumber || qIndex + 1} (Score: {question.score || 0})
                  </Title>
                  <Text className={styles.questionText}>{question.questionText}</Text>
                  {question.questionSampleInput && (
                    <div className={styles.sampleSection}>
                      <Text strong className={styles.sampleLabel}>Sample Input:</Text>
                      <pre className={styles.codeBlock}>
                        {question.questionSampleInput}
                      </pre>
                    </div>
                  )}
                  {question.questionSampleOutput && (
                    <div className={styles.sampleSection}>
                      <Text strong className={styles.sampleLabel}>Sample Output:</Text>
                      <pre className={styles.codeBlock}>
                        {question.questionSampleOutput}
                      </pre>
                    </div>
                  )}
                  {rubrics[question.id] && rubrics[question.id].length > 0 ? (
                    <div className={styles.rubricsSection}>
                      <Text strong className={styles.rubricsLabel}>Grading Criteria:</Text>
                      <ul className={styles.rubricsList}>
                        {rubrics[question.id].map((rubric) => (
                          <li key={rubric.id} className={styles.rubricItem}>
                            {rubric.description} (Max: {rubric.score} points)
                            {rubric.input && rubric.input !== "N/A" && (
                              <div className={styles.rubricInputOutput}>
                                Input: <code className={styles.rubricCode}>{rubric.input}</code>
                              </div>
                            )}
                            {rubric.output && rubric.output !== "N/A" && (
                              <div className={styles.rubricInputOutput}>
                                Output: <code className={styles.rubricCode}>{rubric.output}</code>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <EmptyRubricsState />
                    </div>
                  )}
                  {(question.reviewerComment || canCommentForPaper(paperKey)) && (
                    <div className={styles.commentSection}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <Text strong style={{ color: "#0958d9", fontSize: "15px" }}>
                          Reviewer Comment:
                        </Text>
                        {canCommentForPaper(paperKey) && (
                          <Button
                            variant="primary"
                            size="large"
                            icon={question.reviewerComment ? <EditOutlined /> : <CommentOutlined />}
                            onClick={() => handleOpenCommentModal(question)}
                            disabled={isActionDisabled && !isRejected}
                            className={styles.commentButton}
                          >
                            {question.reviewerComment ? "Edit Comment" : "Add Comment"}
                          </Button>
                        )}
                      </div>
                      {question.reviewerComment ? (
                        <div>
                          <div className={styles.commentBox}>
                            <Text className={styles.commentText}>{question.reviewerComment}</Text>
                          </div>
                          <div className={styles.commentMeta}>
                            <Text type="secondary" style={{ fontSize: "12px" }}>
                              <Text className={styles.commentMetaLabel}>Commented by:</Text> {approvalItem.assignedApproverLecturerName || user?.fullName || "Unknown"}
                            </Text>
                            {question.updatedAt && (
                              <Text type="secondary" style={{ fontSize: "12px" }}>
                                <Text className={styles.commentMetaLabel}>Date:</Text> {new Date(question.updatedAt).toLocaleDateString("en-US", {
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
                </div>
              ))}
            </div>
          ) : (
            <EmptyQuestionsState />
          )}
        </div>
      ),
      className: styles.mainPanel,
    };
  });
  return (
    <div className={styles.wrapper}>
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <Title level={2} className={styles.headerTitle}>
            Approval Detail: {template.name}
          </Title>
          <div className={styles.headerActions}>
            {totalScore > 0 && (
              <Tag color="blue" className={styles.totalScoreTag}>
                Total Score: {totalScore} points
              </Tag>
            )}
            <AntButton
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/lecturer/approval")}
              size="large"
            >
              Back
            </AntButton>
          </div>
          </div>
        </div>
      <div className={styles.actionCard}>
        <div className={styles.actionCardContent}>
          {rejectReasonVisibleForItem && (
            <div className={styles.rejectReasonSection}>
              <Text strong className={styles.rejectReasonLabel}>
                Reject Reason:
              </Text>
              <TextArea
                rows={4}
                placeholder="Please provide a detailed reason for rejecting this assessment template..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={isActionDisabled}
                className={styles.rejectReasonTextArea}
              />
            </div>
          )}
          <div className={styles.actionButtons}>
            <AntButton
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={handleApprove}
              loading={isSubmitting}
              disabled={isActionDisabled || !!rejectReasonVisibleForItem}
              className={styles.approveButton}
            >
              {currentStatus === AssignRequestStatus.COMPLETED ? "Approved" : "Approve"}
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
                className={styles.cancelButton}
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
                  const firstPaperKey = papers.length > 0 ? `paper-${papers[0].id}` : null;
                  if (firstPaperKey) {
                    setRejectReasonVisibleForItem(firstPaperKey);
                  }
                }
              }}
              loading={isSubmitting}
              disabled={isActionDisabled}
              className={styles.rejectButton}
            >
              {currentStatus === AssignRequestStatus.REJECTED
                ? "Rejected"
                : rejectReasonVisibleForItem
                ? "Confirm Reject"
                : "Reject"}
            </AntButton>
          </div>
        </div>
      </div>
      <Collapse
        activeKey={outerActiveKeys}
        onChange={(keys) => setOuterActiveKeys(keys)}
        bordered={false}
        className={styles.mainCollapse}
        items={courseCollapseItems}
      />
      {}
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
      {}
      {showScrollTop && (
        <AntButton
          type="primary"
          shape="circle"
          size="large"
          icon={<VerticalAlignTopOutlined />}
          onClick={scrollToTop}
          className={styles.scrollTopButton}
        />
      )}
    </div>
  );
}