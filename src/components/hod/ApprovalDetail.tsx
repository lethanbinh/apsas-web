"use client";

import { useAuth } from "@/hooks/useAuth";
import { AssessmentQuestion } from "@/services/assessmentQuestionService";
import {
  ApiApprovalItem,
  ApiAssessmentTemplate,
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
    isSubmitting || currentStatus === 3 || currentStatus === 5;
  const statusInfo = getStatusProps(currentStatus);
  const isRejected = currentStatus === 3;


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



  const canAssignApprover = currentStatus !== 3 && currentStatus !== 5;

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
          { }
          {template.description && (
            <>
              <Title level={5}>Description</Title>
              <Text>{template.description}</Text>
              <Divider />
            </>
          )}

          { }
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

          { }
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

                  { }
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
                              <Text strong style={{ color: "#0958d9" }}>Commented by:</Text> {approvalItem.assignedByHODName || user?.fullName || "Unknown"}
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
              onClick={() => router.push("/hod/approval")}
            >
              Back
            </AntButton>
          </div>
        </div>

        { }
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

      { }
      <Card
        style={{
          marginBottom: "24px",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          backgroundColor: "#ffffff",
        }}
        bodyStyle={{ padding: "20px 24px" }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div>
            <Title level={4} style={{ margin: 0, color: "#2F327D", marginBottom: "8px" }}>
              <UserOutlined style={{ marginRight: "8px" }} />
              Approval Authority Assignment
            </Title>
            <Text type="secondary" style={{ fontSize: "14px" }}>
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
              <Text strong style={{ display: "block", marginBottom: "8px" }}>
                Approver Lecturer:
              </Text>
              {approversForSelect.length > 0 ? (
                <Space style={{ width: "100%", maxWidth: "400px" }}>
                  <Select
                    style={{ flex: 1, minWidth: "200px" }}
                    placeholder="No approver assigned"
                    value={selectedApproverLecturerId ?? 0}
                    onChange={(value) => handleApproverChange(value, setSelectedApproverLecturerId)}
                    loading={isUpdatingApprover}
                    showSearch
                    optionFilterProp="label"
                    disabled={isUpdatingApprover}
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
                    >
                      Unassign
                    </Button>
                  )}
                </Space>
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

      { }
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