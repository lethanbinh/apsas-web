"use client";
import { useAuth } from "@/hooks/useAuth";
import { AssessmentQuestion } from "@/services/assessmentQuestionService";
import {
  ApiApprovalItem,
  ApiAssessmentTemplate,
  AssignRequestStatus,
} from "@/types";
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined, CloseOutlined, CommentOutlined, DownloadOutlined, EditOutlined, PaperClipOutlined, UserOutlined, VerticalAlignTopOutlined } from "@ant-design/icons";
import type { CollapseProps } from "antd";
import { Alert, Button as AntButton, App, Card, Collapse, Divider, Input, List, Select, Space, Spin, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import styles from "./ApprovalDetail.module.css";
import { useApprovalData } from "./ApprovalDetail/hooks/useApprovalData";
import { useApprovalHandlers } from "./ApprovalDetail/hooks/useApprovalHandlers";
import { calculateTotalScore, getStatusProps } from "./ApprovalDetail/utils";
import { QuestionCommentModal } from "./QuestionCommentModal";
import { EmptyPapersState, EmptyQuestionsState, EmptyRubricsState } from "@/components/shared/EmptyState";
const { Title, Text } = Typography;
const { TextArea } = Input;
interface ApprovalDetailProps {
  template: ApiAssessmentTemplate;
  approvalItem: ApiApprovalItem;
}
export default function ApprovalDetail({
  template,
  approvalItem,
}: ApprovalDetailProps) {
  const router = useRouter();
  const { message: antMessage } = App.useApp();
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState(approvalItem.status);
  const [outerActiveKeys, setOuterActiveKeys] = useState<string | string[]>([]);
  const [selectedQuestionForComment, setSelectedQuestionForComment] = useState<AssessmentQuestion | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedApproverLecturerId, setSelectedApproverLecturerId] = useState<number | undefined>(
    approvalItem.assignedApproverLecturerId && approvalItem.assignedApproverLecturerId !== 0
      ? approvalItem.assignedApproverLecturerId
      : undefined
  );
  const {
    loading,
    papers,
    questions,
    rubrics,
    files,
    lecturers,
    questionComments,
    refreshQuestions,
  } = useApprovalData(template);
  const {
    isSubmitting,
    isUpdatingApprover,
    rejectReasonVisibleForItem,
    setRejectReasonVisibleForItem,
    rejectReason,
    setRejectReason,
    handleApproverChange,
    handleApprove,
    handleRejectClick,
  } = useApprovalHandlers(
    approvalItem,
    currentStatus,
    setCurrentStatus,
    questionComments,
    papers,
    selectedApproverLecturerId,
    refreshQuestions
  );
  useEffect(() => {
    if (papers.length > 0) {
      setOuterActiveKeys([`paper-${papers[0].id}`]);
    }
  }, [papers]);
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
  const handleOpenCommentModal = (question: AssessmentQuestion) => {
    setSelectedQuestionForComment(question);
    setIsCommentModalOpen(true);
  };
  const handleCommentUpdateSuccess = () => {
    refreshQuestions();
  };
  const isActionDisabled =
    isSubmitting || currentStatus !== AssignRequestStatus.ACCEPTED;
  const statusInfo = getStatusProps(currentStatus);
  const isRejected = currentStatus === AssignRequestStatus.REJECTED;
  const canCommentForPaper = (paperKey: string) => {
    return isRejected || rejectReasonVisibleForItem === paperKey;
  };
  const totalScore = calculateTotalScore(questions, rubrics);
  const availableApprovers = lecturers.filter(
    (lecturer) => Number(lecturer.lecturerId) !== approvalItem.assignedLecturerId
  );
  const approverLecturer = lecturers.find(
    (lecturer) => Number(lecturer.lecturerId) === selectedApproverLecturerId
  );
  const approversForSelect = approverLecturer &&
    !availableApprovers.find(lec => Number(lec.lecturerId) === selectedApproverLecturerId)
    ? [approverLecturer, ...availableApprovers]
    : availableApprovers;
  const canAssignApprover = currentStatus === AssignRequestStatus.ACCEPTED;
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }
  if (papers.length === 0) {
    return <EmptyPapersState backPath="/hod/approval" />;
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
                            const proxyUrl = `/api/file-proxy?url=${encodeURIComponent(file.fileUrl)}`;
                            const response = await fetch(proxyUrl);
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
                      href={`/api/file-proxy?url=${encodeURIComponent(file.fileUrl)}`}
                      download={file.name}
                      className={styles.fileLink}
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const proxyUrl = `/api/file-proxy?url=${encodeURIComponent(file.fileUrl)}`;
                          const response = await fetch(proxyUrl);
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
                              <Text className={styles.commentMetaLabel}>Commented by:</Text> {approvalItem.assignedByHODName || user?.fullName || "Unknown"}
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
              onClick={() => router.push("/hod/approval")}
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
                  handleRejectClick(questions);
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
      <Card className={styles.approverCard}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Title level={4} className={styles.approverCardTitle}>
              <UserOutlined />
              Approval Authority Assignment
            </Title>
            <Text type="secondary" className={styles.approverCardDescription}>
              Assign a lecturer to review and approve this assessment template
            </Text>
          </div>
          {approverLecturer && (
            <Alert
              message={
                <Space>
                  <Text strong>Assigned Approver:</Text>
                  <Text>{approverLecturer.fullName} ({approverLecturer.accountCode})</Text>
                </Space>
              }
              type="info"
              showIcon
              style={{ borderRadius: "8px" }}
            />
          )}
          {canAssignApprover && (
            <div>
              <Text strong style={{ display: "block", marginBottom: "12px", fontSize: "15px" }}>
                Approver Lecturer:
              </Text>
              {approversForSelect.length > 0 ? (
                <div className={styles.approverSelectWrapper}>
                  <Select
                    className={styles.approverSelect}
                    placeholder="No approver assigned"
                    value={selectedApproverLecturerId ?? 0}
                    onChange={(value) => handleApproverChange(value, setSelectedApproverLecturerId)}
                    loading={isUpdatingApprover}
                    showSearch
                    optionFilterProp="label"
                    disabled={isUpdatingApprover}
                    size="large"
                  >
                    {(!selectedApproverLecturerId || selectedApproverLecturerId === 0) && (
                      <Select.Option value={0} label="No approver assigned">
                        <Text type="secondary">-- No approver assigned --</Text>
                      </Select.Option>
                    )}
                    {approversForSelect.map((lecturer) => (
                      <Select.Option
                        key={lecturer.lecturerId}
                        value={Number(lecturer.lecturerId)}
                        label={`${lecturer.fullName} (${lecturer.accountCode})`}
                      >
                        {lecturer.fullName} ({lecturer.accountCode})
                      </Select.Option>
                    ))}
                  </Select>
                  {selectedApproverLecturerId && selectedApproverLecturerId !== 0 && (
                    <Button
                      variant="danger"
                      onClick={() => handleApproverChange(0, setSelectedApproverLecturerId)}
                      loading={isUpdatingApprover}
                      disabled={isUpdatingApprover}
                      size="large"
                    >
                      Unassign
                    </Button>
                  )}
                </div>
              ) : (
                <Alert
                  message="No available lecturers"
                  description="There are no other lecturers available to assign as approver."
                  type="warning"
                  showIcon
                  style={{ borderRadius: "8px" }}
                />
              )}
            </div>
          )}
        </Space>
      </Card>
      <Collapse
        activeKey={outerActiveKeys}
        onChange={(keys) => setOuterActiveKeys(keys)}
        bordered={false}
        className={styles.mainCollapse}
        items={courseCollapseItems}
      />
      { }
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