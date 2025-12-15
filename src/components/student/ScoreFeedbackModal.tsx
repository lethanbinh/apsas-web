"use client";

import { RubricItem } from "@/services/rubricItemService";
import { CloseOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Collapse, Descriptions, Divider, Input, Modal, Row, Space, Spin, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import React, { useMemo } from "react";
import { AssignmentData } from "./data";
import styles from "./ScoreFeedbackModal.module.css";
import { QuestionWithRubrics, useScoreFeedbackData } from "./ScoreFeedbackModal/hooks/useScoreFeedbackData";
import { toVietnamTime } from "./ScoreFeedbackModal/utils";
const { Title, Text } = Typography;
const { TextArea } = Input;

interface ScoreFeedbackModalProps {
  open: boolean;
  onCancel: () => void;
  data: AssignmentData;
}

export const ScoreFeedbackModal: React.FC<ScoreFeedbackModalProps> = ({
  open,
  onCancel,
  data,
}) => {
  const {
    lastSubmission,
    latestGradingSession,
    latestGradeItems,
    totalScore,
    feedback,
    questions,
    loading,
    isLoadingFeedbackFormatting,
    isLoadingFeedback,
  } = useScoreFeedbackData(open, data);


  const hasScore = () => {

    if (latestGradingSession && latestGradingSession.status === 1) {
      return true;
    }

    if (totalScore !== undefined && totalScore !== null) {
      return true;
    }

    if (latestGradeItems.length > 0) {
      return true;
    }

    if (lastSubmission?.lastGrade !== undefined && lastSubmission?.lastGrade !== null) {
      return true;
    }

    if (questions.length > 0 && questions.some(q => {
      const scores = Object.values(q.rubricScores || {});
      return scores.length > 0;
    })) {
      return true;
    }
    return false;
  };


  const hasFeedback = () => {

    if (feedback?.overallFeedback && feedback.overallFeedback.trim() !== "") {
      return true;
    }

    if (feedback?.strengths || feedback?.weaknesses || feedback?.codeQuality ||
      feedback?.algorithmEfficiency || feedback?.suggestionsForImprovement ||
      feedback?.bestPractices || feedback?.errorHandling) {
      return true;
    }

    if (data.overallFeedback || data.suggestionsAvoid || data.suggestionsImprove) {
      return true;
    }

    if (latestGradeItems.length > 0 && latestGradeItems.some(item => item.comments && item.comments.trim() !== "")) {
      return true;
    }
    return false;
  };


  const maxScore = useMemo(() => {
    return questions.reduce((sum, q) => {
      return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
    }, 0);
  }, [questions]);


  const getTotalScoreDisplay = () => {

    if (latestGradingSession && latestGradingSession.status === 1) {
      if (maxScore > 0) {
        return `${Number(totalScore).toFixed(2)}/${Number(maxScore).toFixed(2)}`;
      }

      return Number(totalScore).toFixed(2);
    }


    if (totalScore !== undefined && totalScore !== null) {
      if (maxScore > 0) {
        return `${Number(totalScore).toFixed(2)}/${Number(maxScore).toFixed(2)}`;
      }
      return Number(totalScore).toFixed(2);
    }


    if (lastSubmission?.lastGrade !== undefined && lastSubmission?.lastGrade !== null) {
      if (maxScore > 0) {
        return `${Number(lastSubmission.lastGrade).toFixed(2)}/${Number(maxScore).toFixed(2)}`;
      }
      return Number(lastSubmission.lastGrade).toFixed(2);
    }


    if (latestGradeItems.length > 0) {
      const calculatedTotal = latestGradeItems.reduce((sum, item) => sum + item.score, 0);
      if (maxScore > 0) {
        return `${Number(calculatedTotal).toFixed(2)}/${Number(maxScore).toFixed(2)}`;
      }
      return Number(calculatedTotal).toFixed(2);
    }


    if (questions.length > 0) {
      const calculatedTotal = questions.reduce((sum, q) => {
        const questionTotal = Object.values(q.rubricScores || {}).reduce((s, score) => s + (score || 0), 0);
        return sum + questionTotal;
      }, 0);
      if (maxScore > 0 && calculatedTotal > 0) {
        return `${Number(calculatedTotal).toFixed(2)}/${Number(maxScore).toFixed(2)}`;
      }
      if (calculatedTotal > 0) {
        return Number(calculatedTotal).toFixed(2);
      }
    }


    return null;
  };

  const getQuestionColumns = (question: QuestionWithRubrics): ColumnsType<RubricItem> => [
    {
      title: "Criteria",
      dataIndex: "description",
      key: "description",
      width: 200,
      fixed: "left" as const,
      render: (text: string) => (
        <Tooltip title={text} placement="topLeft">
          <Text strong style={{ fontSize: "13px" }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Input",
      dataIndex: "input",
      key: "input",
      width: 120,
      render: (text: string) => {
        const displayText = text && text !== "N/A" ? text : "N/A";
        return (
          <Tooltip title={displayText} placement="top">
            <Text
              code
              style={{
                fontSize: "11px",
                display: "block",
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {displayText}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Output",
      dataIndex: "output",
      key: "output",
      width: 120,
      render: (text: string) => {
        const displayText = text && text !== "N/A" ? text : "N/A";
        return (
          <Tooltip title={displayText} placement="top">
            <Text
              code
              style={{
                fontSize: "11px",
                display: "block",
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {displayText}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Max Score",
      dataIndex: "score",
      key: "maxScore",
      width: 100,
      align: "center",
      render: (score: number) => (
        <Tag color="blue" style={{ margin: 0 }}>
          {score}
        </Tag>
      ),
    },
    {
      title: "Score",
      key: "rubricScore",
      width: 80,
      align: "center",
      render: (_: any, record: RubricItem) => {
        const currentScore = question.rubricScores[record.id] || 0;
        const maxScore = record.score;
        const scorePercentage = maxScore > 0 ? (currentScore / maxScore) * 100 : 0;
        const tagColor = scorePercentage >= 80 ? "green" : scorePercentage >= 50 ? "orange" : "red";
        return (
          <Tag color={tagColor} style={{ margin: 0, fontWeight: "bold" }}>
            {currentScore}
          </Tag>
        );
      },
    },
    {
      title: "Comments",
      key: "rubricComments",
      width: 400,
      render: (_: any, record: RubricItem) => {
        const comment = question.rubricComments?.[record.id] || "";
        if (!comment || comment === "-") {
          return <Text type="secondary" style={{ fontSize: "12px" }}>-</Text>;
        }


        const maxLength = 150;
        const isLong = comment.length > maxLength;
        const displayText = isLong ? comment.substring(0, maxLength) + "..." : comment;

        return (
          <Tooltip title={comment} placement="topLeft" overlayStyle={{ maxWidth: "500px" }}>
            <div style={{
              fontSize: "12px",
              lineHeight: "1.5",
              wordBreak: "break-word",
              maxHeight: "100px",
              overflowY: "auto",
              padding: "4px 0"
            }}>
              <Text style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                {displayText}
              </Text>
            </div>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <Title level={3} style={{ margin: 0 }}>
          Assignment Score & Feedback
        </Title>
      }
      open={open}
      onCancel={onCancel}
      footer={null}
      width={1200}
      style={{ top: 20 }}
      closeIcon={<CloseOutlined />}
    >
      <Spin spinning={loading}>
        <div className={styles.container}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Card className={styles.headerCard}>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="Assignment">{data.title}</Descriptions.Item>
                <Descriptions.Item label="Status">{data.status}</Descriptions.Item>
                {lastSubmission && (
                  <>
                    <Descriptions.Item label="Submission ID">{lastSubmission.id}</Descriptions.Item>
                    <Descriptions.Item label="Submitted At">
                      {lastSubmission.submittedAt
                        ? toVietnamTime(lastSubmission.submittedAt).format("DD MMM YYYY, HH:mm")
                        : "N/A"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Submission File">
                      {lastSubmission.submissionFile?.name || "N/A"}
                    </Descriptions.Item>
                  </>
                )}
                <Descriptions.Item label="Total Score">
                  {getTotalScoreDisplay() !== null ? (
                    <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
                      {getTotalScoreDisplay()}
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: "14px" }}>
                      No score available
                    </Text>
                  )}
                </Descriptions.Item>
                {latestGradingSession && (
                  <>
                    <Descriptions.Item label="Grading Status">
                      <Tag color={
                        latestGradingSession.status === 1 ? "green" :
                          latestGradingSession.status === 2 ? "red" :
                            "orange"
                      }>
                        {latestGradingSession.status === 1 ? "Completed" :
                          latestGradingSession.status === 2 ? "Failed" :
                            "Processing"}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Grading Type">
                      <Tag color={
                        latestGradingSession.gradingType === 0 ? "blue" :
                          latestGradingSession.gradingType === 1 ? "purple" :
                            "cyan"
                      }>
                        {latestGradingSession.gradingType === 0 ? "AI" :
                          latestGradingSession.gradingType === 1 ? "Lecturer" :
                            "Both"}
                      </Tag>
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </Card>

            { }
            {questions.length > 0 && hasScore() && (
              <Card className={styles.questionsCard}>
                <Title level={3}>Grading Details</Title>
                <Text type="secondary">
                  Total Questions: {questions.length} | Total Max Score:{" "}
                  {maxScore.toFixed(2)}
                </Text>
                <Divider />

                <Collapse
                  defaultActiveKey={questions.map((_, i) => i.toString())}
                  items={[...questions].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0)).map((question, index) => {
                    const questionTotalScore = Object.values(question.rubricScores).reduce(
                      (sum, score) => sum + (score || 0),
                      0
                    );
                    const questionMaxScore = question.rubrics.reduce(
                      (sum, r) => sum + r.score,
                      0
                    );

                    return {
                      key: index.toString(),
                      label: (
                        <div className={styles.questionHeader}>
                          <span>
                            <strong>Question {index + 1}:</strong> {question.questionText}
                          </span>
                          <Space>
                            <Tag color="blue">
                              Score: {questionTotalScore.toFixed(2)}/{questionMaxScore.toFixed(2)}
                            </Tag>
                            <Tag color="green">Max: {questionMaxScore.toFixed(2)}</Tag>
                          </Space>
                        </div>
                      ),
                      children: (
                        <div className={styles.questionContent}>
                          {question.questionSampleInput && (
                            <div className={styles.sampleSection}>
                              <Text strong>Sample Input:</Text>
                              <pre className={styles.codeBlock}>
                                {question.questionSampleInput}
                              </pre>
                            </div>
                          )}
                          {question.questionSampleOutput && (
                            <div className={styles.sampleSection}>
                              <Text strong>Sample Output:</Text>
                              <pre className={styles.codeBlock}>
                                {question.questionSampleOutput}
                              </pre>
                            </div>
                          )}

                          <Divider />

                          <Title level={5} style={{ marginBottom: 12 }}>
                            Grading Criteria ({question.rubrics.length})
                          </Title>
                          <div style={{ overflowX: "auto" }}>
                            <Table
                              columns={getQuestionColumns(question)}
                              dataSource={question.rubrics}
                              rowKey="id"
                              pagination={false}
                              size="small"
                              scroll={{ x: 1000 }}
                              className={styles.gradingTable}
                            />
                          </div>
                        </div>
                      ),
                    };
                  })}
                />
              </Card>
            )}

            { }
            {questions.length === 0 && data.gradeCriteria && data.gradeCriteria.length > 0 && (
              <Card className={styles.questionsCard}>
                <Title level={3}>Grading Details</Title>
                <Text type="secondary">
                  Total Criteria: {data.gradeCriteria.length} | Total Score: {data.totalScore}
                </Text>
                <Divider />

                <Collapse
                  defaultActiveKey={data.gradeCriteria.map((_, i) => i.toString())}
                  items={data.gradeCriteria.map((criterion, index) => {
                    return {
                      key: index.toString(),
                      label: (
                        <div className={styles.questionHeader}>
                          <span>
                            <strong>Criteria {index + 1}:</strong> {criterion.name}
                          </span>
                          <Space>
                            <Tag color="blue">
                              Score: {criterion.score}
                            </Tag>
                          </Space>
                        </div>
                      ),
                      children: (
                        <div className={styles.questionContent}>
                          <Title level={5}>Reason for this score</Title>
                          <TextArea
                            rows={6}
                            value={criterion.reason || "No reason provided."}
                            readOnly
                            style={{ marginTop: 8 }}
                          />
                        </div>
                      ),
                    };
                  })}
                />
              </Card>
            )}

            <Card className={styles.feedbackCard}>
              <Spin spinning={isLoadingFeedback || isLoadingFeedbackFormatting}>
                <Title level={3}>Detailed Feedback</Title>
                <Divider />

                {!hasFeedback() && !isLoadingFeedback ? (
                  <Alert
                    message="No feedback available"
                    description="No feedback has been provided for this submission yet. Please wait for the lecturer to review your work."
                    type="info"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                ) : (
                  <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <div>
                      <Title level={5}>Overall Feedback</Title>
                      <TextArea
                        rows={8}
                        value={feedback?.overallFeedback || data.overallFeedback || ""}
                        readOnly
                        placeholder="No overall feedback provided yet."
                      />
                    </div>

                    { }
                    {(feedback?.strengths || feedback?.weaknesses || feedback?.codeQuality || feedback?.algorithmEfficiency || feedback?.suggestionsForImprovement || feedback?.bestPractices || feedback?.errorHandling) && (
                      <>
                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <div>
                              <Title level={5}>Strengths</Title>
                              <TextArea
                                rows={7}
                                value={feedback?.strengths || ""}
                                readOnly
                                placeholder="No strengths feedback provided yet."
                              />
                            </div>
                          </Col>
                          <Col xs={24} md={12}>
                            <div>
                              <Title level={5}>Weaknesses</Title>
                              <TextArea
                                rows={7}
                                value={feedback?.weaknesses || ""}
                                readOnly
                                placeholder="No weaknesses feedback provided yet."
                              />
                            </div>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <div>
                              <Title level={5}>Code Quality</Title>
                              <TextArea
                                rows={6}
                                value={feedback?.codeQuality || ""}
                                readOnly
                                placeholder="No code quality feedback provided yet."
                              />
                            </div>
                          </Col>
                          <Col xs={24} md={12}>
                            <div>
                              <Title level={5}>Algorithm Efficiency</Title>
                              <TextArea
                                rows={6}
                                value={feedback?.algorithmEfficiency || ""}
                                readOnly
                                placeholder="No algorithm efficiency feedback provided yet."
                              />
                            </div>
                          </Col>
                        </Row>

                        <div>
                          <Title level={5}>Suggestions for Improvement</Title>
                          <TextArea
                            rows={8}
                            value={feedback?.suggestionsForImprovement || ""}
                            readOnly
                            placeholder="No suggestions provided yet."
                          />
                        </div>

                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <div>
                              <Title level={5}>Best Practices</Title>
                              <TextArea
                                rows={6}
                                value={feedback?.bestPractices || ""}
                                readOnly
                                placeholder="No best practices feedback provided yet."
                              />
                            </div>
                          </Col>
                          <Col xs={24} md={12}>
                            <div>
                              <Title level={5}>Error Handling</Title>
                              <TextArea
                                rows={6}
                                value={feedback?.errorHandling || ""}
                                readOnly
                                placeholder="No error handling feedback provided yet."
                              />
                            </div>
                          </Col>
                        </Row>
                      </>
                    )}

                    { }
                    {!feedback && data.suggestionsAvoid && (
                      <>
                        <div>
                          <Title level={5}>What you should avoid</Title>
                          <TextArea
                            rows={6}
                            value={data.suggestionsAvoid}
                            readOnly
                          />
                        </div>
                        {data.suggestionsImprove && (
                          <div>
                            <Title level={5}>What you should improve</Title>
                            <TextArea
                              rows={6}
                              value={data.suggestionsImprove}
                              readOnly
                            />
                          </div>
                        )}
                      </>
                    )}
                  </Space>
                )}
              </Spin>
            </Card>

            { }
            <div style={{ textAlign: "right", marginTop: 16 }}>
              <Space>
                <Button type="primary" onClick={onCancel}>
                  Close
                </Button>
              </Space>
            </div>
          </Space>
        </div>
      </Spin>

    </Modal>
  );
};
