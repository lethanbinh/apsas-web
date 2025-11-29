"use client";

import { assessmentPaperService } from "@/services/assessmentPaperService";
import { AssessmentQuestion, assessmentQuestionService } from "@/services/assessmentQuestionService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { classAssessmentService } from "@/services/classAssessmentService";
import { FeedbackData } from "@/services/geminiService";
import { gradingService, GradingSession } from "@/services/gradingService";
import { gradeItemService, GradeItem } from "@/services/gradeItemService";
import { RubricItem, rubricItemService } from "@/services/rubricItemService";
import { Submission, submissionService } from "@/services/submissionService";
import { submissionFeedbackService, SubmissionFeedback } from "@/services/submissionFeedbackService";
import { geminiService } from "@/services/geminiService";
import {
  ArrowLeftOutlined,
  EyeOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography
} from "antd";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState, useMemo } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import { gradingGroupService } from "@/services/gradingGroupService";
import styles from "./page.module.css";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
  rubricComments: { [rubricId: number]: string };
}

export default function AssignmentGradingPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [viewExamModalVisible, setViewExamModalVisible] = useState(false);
  const [gradingHistoryModalVisible, setGradingHistoryModalVisible] = useState(false);
  const [feedbackHistoryModalVisible, setFeedbackHistoryModalVisible] = useState(false);

  useEffect(() => {
    // Get submissionId from localStorage
    const savedSubmissionId = localStorage.getItem("selectedSubmissionId");
    if (savedSubmissionId) {
      setSubmissionId(Number(savedSubmissionId));
    } else {
      message.error("No submission selected");
      router.back();
    }
  }, []);

  // Fetch class assessments to find submission
  const classIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem("selectedClassId") : null;
  const { data: classAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(classIdFromStorage!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: Number(classIdFromStorage!),
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!classIdFromStorage && !!submissionId,
  });

  // Fetch submissions for all class assessments
  const classAssessmentIds = classAssessmentsData?.items.map(ca => ca.id) || [];
  const submissionsQueries = useQueries({
    queries: classAssessmentIds.map((classAssessmentId) => ({
      queryKey: ['submissions', 'byClassAssessmentId', classAssessmentId],
      queryFn: () => submissionService.getSubmissionList({
        classAssessmentId: classAssessmentId,
      }),
      enabled: classAssessmentIds.length > 0 && !!submissionId,
    })),
  });

  // Find the specific submission
  const submissionFromClassAssessments = useMemo(() => {
    if (!submissionId) return null;
    for (const query of submissionsQueries) {
      if (query.data) {
        const found = query.data.find((s: Submission) => s.id === submissionId);
        if (found) return found;
      }
    }
    // If not found in class assessments, try fetching all submissions
    return null;
  }, [submissionId, submissionsQueries]);

  // Fallback: fetch all submissions if not found in class assessments
  const { data: allSubmissionsData } = useQuery({
    queryKey: ['submissions', 'all'],
    queryFn: () => submissionService.getSubmissionList({}),
    enabled: !!submissionId && !submissionFromClassAssessments && classAssessmentIds.length === 0,
  });

  const submissionFromAll = useMemo(() => {
    if (!submissionId || !allSubmissionsData) return null;
    return allSubmissionsData.find((s: Submission) => s.id === submissionId) || null;
  }, [submissionId, allSubmissionsData]);

  const finalSubmission = submissionFromClassAssessments || submissionFromAll;

  // Determine assessmentTemplateId
  const { data: gradingGroupsData } = useQuery({
    queryKey: queryKeys.grading.groups.all,
    queryFn: () => gradingGroupService.getGradingGroups({}),
    enabled: !!finalSubmission?.gradingGroupId,
  });

  const assessmentTemplateId = useMemo(() => {
    if (!finalSubmission) return null;
    if (finalSubmission.gradingGroupId && gradingGroupsData) {
      const gradingGroup = gradingGroupsData.find((gg) => gg.id === finalSubmission.gradingGroupId);
      if (gradingGroup?.assessmentTemplateId) {
        return gradingGroup.assessmentTemplateId;
      }
    }
    if (finalSubmission.classAssessmentId && classAssessmentsData?.items) {
      const classAssessment = classAssessmentsData.items.find(
        (ca) => ca.id === finalSubmission.classAssessmentId
      );
      if (classAssessment?.assessmentTemplateId) {
        return classAssessment.assessmentTemplateId;
      }
    }
    return null;
  }, [finalSubmission, gradingGroupsData, classAssessmentsData]);

  // Fetch papers
  const { data: papersData } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(assessmentTemplateId!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplateId!,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: !!assessmentTemplateId,
  });

  // Fetch questions for each paper
  const papers = papersData?.items || [];
  const questionsQueries = useQueries({
    queries: papers.map((paper) => ({
      queryKey: queryKeys.assessmentQuestions.byPaperId(paper.id),
      queryFn: () => assessmentQuestionService.getAssessmentQuestions({
        assessmentPaperId: paper.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: papers.length > 0,
    })),
  });

  // Fetch rubrics for each question
  const allQuestions = useMemo(() => {
    const questions: AssessmentQuestion[] = [];
    questionsQueries.forEach((query) => {
      if (query.data?.items) {
        questions.push(...query.data.items);
      }
    });
    return questions.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
  }, [questionsQueries]);

  const rubricsQueries = useQueries({
    queries: allQuestions.map((question) => ({
      queryKey: queryKeys.rubricItems.byQuestionId(question.id),
      queryFn: () => rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: question.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: allQuestions.length > 0,
    })),
  });

  // Build questions with rubrics
  const questionsWithRubrics = useMemo(() => {
    const questionsWithRubrics: QuestionWithRubrics[] = [];
    allQuestions.forEach((question, index) => {
      const rubrics = rubricsQueries[index]?.data?.items || [];
      questionsWithRubrics.push({
        ...question,
        rubrics,
        rubricScores: {},
        rubricComments: {},
      });
    });
    return questionsWithRubrics;
  }, [allQuestions, rubricsQueries]);

  // Fetch latest grading session
  const { data: gradingSessionsData } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId!, pageNumber: 1, pageSize: 1 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: submissionId!,
      pageNumber: 1,
      pageSize: 1, // Only fetch latest
    }),
    enabled: !!submissionId,
  });

  const latestGradingSession = useMemo(() => {
    if (!gradingSessionsData?.items || gradingSessionsData.items.length === 0) return null;
    return gradingSessionsData.items[0];
  }, [gradingSessionsData]);

  // Fetch grade items for latest session
  const { data: gradeItemsData } = useQuery({
    queryKey: ['gradeItems', 'byGradingSessionId', latestGradingSession?.id],
    queryFn: () => gradeItemService.getGradeItems({
      gradingSessionId: latestGradingSession!.id,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!latestGradingSession?.id,
  });

  const latestGradeItems = gradeItemsData?.items || [];

  // Map grade items to questions
  const questionsWithScores = useMemo((): QuestionWithRubrics[] => {
    if (latestGradeItems.length === 0) return questionsWithRubrics;

    // Filter to get only the latest grade item for each rubricItemId
    const sortedItems = [...latestGradeItems].sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      const createdA = new Date(a.createdAt).getTime();
      const createdB = new Date(b.createdAt).getTime();
      return createdB - createdA;
    });

    const latestGradeItemsMap = new Map<number, GradeItem>();
    sortedItems.forEach((item) => {
      if (item.rubricItemId) {
        if (!latestGradeItemsMap.has(item.rubricItemId)) {
          latestGradeItemsMap.set(item.rubricItemId, item);
        }
      }
    });

    const latestGradeItemsForDisplay = Array.from(latestGradeItemsMap.values());

    return questionsWithRubrics.map((question) => {
      const newRubricScores = { ...question.rubricScores };
      const newRubricComments = { ...(question.rubricComments || {}) };

      let questionComment = "";
      question.rubrics.forEach((rubric) => {
        const matchingGradeItem = latestGradeItemsForDisplay.find(
          (item) => item.rubricItemId === rubric.id
        );
        if (matchingGradeItem) {
          newRubricScores[rubric.id] = matchingGradeItem.score;
          if (!questionComment && matchingGradeItem.comments) {
            questionComment = matchingGradeItem.comments;
          }
        }
      });

      newRubricComments[question.id] = questionComment;

      return {
        ...question,
        rubricScores: newRubricScores,
        rubricComments: newRubricComments,
      };
    });
  }, [questionsWithRubrics, latestGradeItems]);

  // Calculate total score
  const totalScore = useMemo(() => {
    if (latestGradeItems.length > 0) {
      return latestGradeItems.reduce((sum, item) => sum + item.score, 0);
    }
    return latestGradingSession?.grade || 0;
  }, [latestGradeItems, latestGradingSession]);

  // Helper function to deserialize feedback
  const deserializeFeedback = (feedbackText: string): FeedbackData | null => {
    if (!feedbackText || feedbackText.trim() === "") {
      return null;
    }

    try {
      const parsed = JSON.parse(feedbackText);
      if (typeof parsed === "object" && parsed !== null) {
        return {
          overallFeedback: parsed.overallFeedback || "",
          strengths: parsed.strengths || "",
          weaknesses: parsed.weaknesses || "",
          codeQuality: parsed.codeQuality || "",
          algorithmEfficiency: parsed.algorithmEfficiency || "",
          suggestionsForImprovement: parsed.suggestionsForImprovement || "",
          bestPractices: parsed.bestPractices || "",
          errorHandling: parsed.errorHandling || "",
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  // Fetch feedback
  const { data: feedbackListData } = useQuery({
    queryKey: ['submissionFeedback', 'bySubmissionId', submissionId],
    queryFn: () => submissionFeedbackService.getSubmissionFeedbackList({
      submissionId: submissionId!,
    }),
    enabled: !!submissionId,
  });

  const feedback = useMemo(() => {
    if (!feedbackListData || feedbackListData.length === 0) {
      return {
        overallFeedback: "",
        strengths: "",
        weaknesses: "",
        codeQuality: "",
        algorithmEfficiency: "",
        suggestionsForImprovement: "",
        bestPractices: "",
        errorHandling: "",
      };
    }

    const existingFeedback = feedbackListData[0];
    const parsedFeedback = deserializeFeedback(existingFeedback.feedbackText);

    if (parsedFeedback) {
      return parsedFeedback;
    }

    // If not structured, return plain text in overallFeedback
    return {
      overallFeedback: existingFeedback.feedbackText,
      strengths: "",
      weaknesses: "",
      codeQuality: "",
      algorithmEfficiency: "",
      suggestionsForImprovement: "",
      bestPractices: "",
      errorHandling: "",
    };
  }, [feedbackListData]);

  const loading = useMemo(() => {
    return (
      (submissionsQueries.some(q => q.isLoading) && !finalSubmission) ||
      (!!submissionId && !finalSubmission && !allSubmissionsData) ||
      (!!assessmentTemplateId && !papersData) ||
      questionsQueries.some(q => q.isLoading) ||
      rubricsQueries.some(q => q.isLoading) ||
      (!!submissionId && !gradingSessionsData) ||
      (!!latestGradingSession?.id && !gradeItemsData) ||
      (!!submissionId && !feedbackListData)
    );
  }, [submissionsQueries, finalSubmission, submissionId, allSubmissionsData, assessmentTemplateId, papersData, questionsQueries, rubricsQueries, gradingSessionsData, latestGradingSession, gradeItemsData, feedbackListData]);

  const handleOpenGradingHistory = () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }
    setGradingHistoryModalVisible(true);
  };

  const handleOpenFeedbackHistory = () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }
    setFeedbackHistoryModalVisible(true);
  };

  // Redirect if submission not found
  useEffect(() => {
    if (!loading && !finalSubmission && submissionId) {
      message.error("Submission not found");
      router.back();
    }
  }, [loading, finalSubmission, submissionId]);

  const renderFeedbackFields = (feedbackData: FeedbackData) => {
    const fields: Array<{ key: keyof FeedbackData; label: string; rows: number; fullWidth?: boolean }> = [
      { key: "overallFeedback", label: "Overall Feedback", rows: 6, fullWidth: true },
      { key: "strengths", label: "Strengths", rows: 8 },
      { key: "weaknesses", label: "Weaknesses", rows: 8 },
      { key: "codeQuality", label: "Code Quality", rows: 6 },
      { key: "algorithmEfficiency", label: "Algorithm Efficiency", rows: 6 },
      { key: "suggestionsForImprovement", label: "Suggestions for Improvement", rows: 6, fullWidth: true },
      { key: "bestPractices", label: "Best Practices", rows: 5 },
      { key: "errorHandling", label: "Error Handling", rows: 5 },
    ];

    const elements: ReactNode[] = [];
    let currentRow: Array<typeof fields[0]> = [];

    fields.forEach((field, index) => {
      const value = feedbackData[field.key] || "";

      if (field.fullWidth) {
        if (currentRow.length > 0) {
          if (currentRow.length === 1) {
            elements.push(
              <div key={`field-${currentRow[0].key}`}>
                <Title level={5}>{currentRow[0].label}</Title>
                <TextArea
                  rows={currentRow[0].rows}
                  value={feedbackData[currentRow[0].key] || ""}
                  readOnly
                  style={{ backgroundColor: "#f5f5f5" }}
                />
              </div>
            );
          } else {
            elements.push(
              <Row gutter={16} key={`row-${index}`}>
                {currentRow.map((f) => (
                  <Col xs={24} md={12} key={f.key}>
                    <div>
                      <Title level={5}>{f.label}</Title>
                      <TextArea
                        rows={f.rows}
                        value={feedbackData[f.key] || ""}
                        readOnly
                        style={{ backgroundColor: "#f5f5f5" }}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            );
          }
          currentRow = [];
        }

        elements.push(
          <div key={`field-${field.key}`}>
            <Title level={5}>{field.label}</Title>
            <TextArea
              rows={field.rows}
              value={value}
              readOnly
              style={{ backgroundColor: "#f5f5f5" }}
            />
          </div>
        );
      } else {
        currentRow.push(field);

        if (currentRow.length === 2 || index === fields.length - 1) {
          if (currentRow.length === 1) {
            elements.push(
              <div key={`field-${currentRow[0].key}`}>
                <Title level={5}>{currentRow[0].label}</Title>
                <TextArea
                  rows={currentRow[0].rows}
                  value={feedbackData[currentRow[0].key] || ""}
                  readOnly
                  style={{ backgroundColor: "#f5f5f5" }}
                />
              </div>
            );
          } else {
            elements.push(
              <Row gutter={16} key={`row-${index}`}>
                {currentRow.map((f) => (
                  <Col xs={24} md={12} key={f.key}>
                    <div>
                      <Title level={5}>{f.label}</Title>
                      <TextArea
                        rows={f.rows}
                        value={feedbackData[f.key] || ""}
                        readOnly
                        style={{ backgroundColor: "#f5f5f5" }}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            );
          }
          currentRow = [];
        }
      }
    });

    return elements;
  };

  if (loading && !finalSubmission) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (!finalSubmission) {
    return null;
  }

  // Use finalSubmission and questionsWithScores directly in render
  const submission = finalSubmission;
  const questions = questionsWithScores;

  const getQuestionColumns = (question: QuestionWithRubrics) => [
    {
      title: "Criteria",
      dataIndex: "description",
      key: "description",
      width: "25%",
    },
    {
      title: "Input",
      dataIndex: "input",
      key: "input",
      width: "15%",
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
      width: "15%",
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
    {
      title: "Score",
      key: "rubricScore",
      width: "25%",
      render: (_: any, record: RubricItem) => {
        const currentScore = question.rubricScores[record.id] || 0;
        return (
          <Text strong style={{ fontSize: "16px", color: currentScore > 0 ? "#52c41a" : "#999" }}>
            {currentScore.toFixed(2)}
          </Text>
        );
      },
    },
  ];

  return (
    <App>
      <div className={styles.container}>
        <Card className={styles.headerCard}>
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <div className={styles.headerActions}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.back()}
              >
                Back
              </Button>
              <Space>
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => setViewExamModalVisible(true)}
                >
                  View Exam
                </Button>
              </Space>
            </div>

            <Descriptions bordered column={2}>
              <Descriptions.Item label="Submission ID">{finalSubmission.id}</Descriptions.Item>
              <Descriptions.Item label="Student Code">
                {finalSubmission.studentCode}
              </Descriptions.Item>
              <Descriptions.Item label="Student Name">
                {finalSubmission.studentName}
              </Descriptions.Item>
              <Descriptions.Item label="Submitted At">
                {finalSubmission.submittedAt
                  ? toVietnamTime(finalSubmission.submittedAt).format("DD/MM/YYYY HH:mm:ss")
                  : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Submission File">
                {finalSubmission.submissionFile?.name || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Total Score">
                <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
                  {totalScore.toFixed(2)}/{questionsWithScores.reduce((sum: number, q: QuestionWithRubrics) => {
                    return sum + q.rubrics.reduce((rubricSum: number, rubric: RubricItem) => rubricSum + rubric.score, 0);
                  }, 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Space>
        </Card>

        <Card className={styles.feedbackCard} style={{ marginTop: 24 }}>
          <Collapse
              defaultActiveKey={[]}
              className={`${styles.collapseWrapper} collapse-feedback`}
              items={[
                {
                  key: "feedback",
                  label: (
                    <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center" }}>
                      Detailed Feedback
                    </Title>
                  ),
                  children: (
                    <div>
                      <Space direction="vertical" size="large" style={{ width: "100%" }}>
                        {renderFeedbackFields(feedback)}
                      </Space>
                    </div>
                  ),
                },
              ]}
            />
        </Card>

        <Card className={styles.questionsCard} style={{ marginTop: 24 }}>
          <Collapse 
            defaultActiveKey={["grading-details"]}
            className={`${styles.collapseWrapper} collapse-grading`}
            items={[
              {
                key: "grading-details",
                label: (
                  <Title level={3} style={{ margin: 0, display: "flex", alignItems: "center" }}>
                    Grading Details
                  </Title>
                ),
                children: (
                  <div>
                    <Row gutter={16}>
                      <Col xs={24} md={6} lg={6}>
                        <div>
                          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                            Total Questions: {questionsWithScores.length}
                          </Text>
                          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                            Total Max Score: {questionsWithScores.reduce((sum: number, q: QuestionWithRubrics) => {
                              return sum + q.rubrics.reduce((rubricSum: number, rubric: RubricItem) => rubricSum + rubric.score, 0);
                            }, 0).toFixed(2)}
                          </Text>
                          <Space direction="vertical" style={{ width: "100%" }}>
                            <Button
                              type="default"
                              icon={<HistoryOutlined />}
                              onClick={handleOpenGradingHistory}
                              block
                            >
                              Grading History
                            </Button>
                            <Button
                              type="default"
                              icon={<HistoryOutlined />}
                              onClick={handleOpenFeedbackHistory}
                              block
                            >
                              Feedback History
                            </Button>
                          </Space>
                        </div>
                      </Col>
                      <Col xs={24} md={18} lg={18}>
                        {(() => {
                          const sortedQuestions = [...questionsWithScores].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));

                          const renderQuestionCollapse = (question: QuestionWithRubrics, index: number) => {
                            const questionTotalScore = Object.values(question.rubricScores).reduce(
                              (sum, score) => sum + (score || 0),
                              0
                            );
                            const questionMaxScore = question.rubrics.reduce(
                              (sum, r) => sum + r.score,
                              0
                            );

                            return {
                              key: `question-${index}`,
                              label: (
                                <div className={styles.questionHeader}>
                                  <span>
                                    <strong>Question {index + 1}:</strong> {question.questionText}
                                  </span>
                                  <Space>
                                    <Tag color="blue">
                                      Score: {questionTotalScore.toFixed(2)}/{questionMaxScore.toFixed(2)}
                                    </Tag>
                                    <Tag color="green">Max: {question.score}</Tag>
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

                                  <Title level={5}>Grading Criteria ({question.rubrics.length})</Title>
                                  <Table
                                    columns={getQuestionColumns(question)}
                                    dataSource={question.rubrics}
                                    rowKey="id"
                                    pagination={false}
                                    size="small"
                                    scroll={{ x: "max-content" }}
                                  />
                                  
                                  <Divider />

                                  <div style={{ marginTop: 16 }}>
                                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                                      Comments
                                    </Text>
                                    <TextArea
                                      rows={4}
                                      value={question.rubricComments?.[question.id] || ""}
                                      readOnly
                                      style={{ backgroundColor: "#f5f5f5" }}
                                      placeholder="No comments available"
                                    />
                                  </div>
                                </div>
                              ),
                            };
                          };

                          return (
                            <Collapse
                              items={sortedQuestions.map((question, index) => 
                                renderQuestionCollapse(question, index)
                              )}
                            />
                          );
                        })()}
                      </Col>
                    </Row>
                  </div>
                ),
              },
            ]}
          />
        </Card>

        <ViewExamModal
          visible={viewExamModalVisible}
          onClose={() => setViewExamModalVisible(false)}
          submission={submission}
        />

        <GradingHistoryModal
          visible={gradingHistoryModalVisible}
          onClose={() => setGradingHistoryModalVisible(false)}
          submissionId={submissionId}
        />

        <FeedbackHistoryModal
          visible={feedbackHistoryModalVisible}
          onClose={() => setFeedbackHistoryModalVisible(false)}
          submissionId={submissionId}
        />
      </div>
    </App>
  );
}

// View Exam Modal Component (same as lecturer version but read-only)
function ViewExamModal({
  visible,
  onClose,
  submission,
}: {
  visible: boolean;
  onClose: () => void;
  submission: Submission | null;
}) {
  const { message } = App.useApp();

  // Determine assessmentTemplateId
  const classIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem("selectedClassId") : null;
  const { data: classAssessmentsData } = useQuery({
    queryKey: queryKeys.classAssessments.byClassId(classIdFromStorage!),
    queryFn: () => classAssessmentService.getClassAssessments({
      classId: Number(classIdFromStorage!),
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!classIdFromStorage && !!submission?.classAssessmentId && visible,
  });

  const { data: gradingGroupsData } = useQuery({
    queryKey: queryKeys.grading.groups.all,
    queryFn: () => gradingGroupService.getGradingGroups({}),
    enabled: !!submission?.gradingGroupId && visible,
  });

  const assessmentTemplateId = useMemo(() => {
    if (!submission) return null;
    if (submission.gradingGroupId && gradingGroupsData) {
      const gradingGroup = gradingGroupsData.find((gg) => gg.id === submission.gradingGroupId);
      if (gradingGroup?.assessmentTemplateId) {
        return gradingGroup.assessmentTemplateId;
      }
    }
    if (submission.classAssessmentId && classAssessmentsData?.items) {
      const classAssessment = classAssessmentsData.items.find(
        (ca) => ca.id === submission.classAssessmentId
      );
      if (classAssessment?.assessmentTemplateId) {
        return classAssessment.assessmentTemplateId;
      }
    }
    return null;
  }, [submission, gradingGroupsData, classAssessmentsData]);

  // Fetch papers
  const { data: papersData } = useQuery({
    queryKey: queryKeys.assessmentPapers.byTemplateId(assessmentTemplateId!),
    queryFn: () => assessmentPaperService.getAssessmentPapers({
      assessmentTemplateId: assessmentTemplateId!,
      pageNumber: 1,
      pageSize: 100,
    }),
    enabled: !!assessmentTemplateId && visible,
  });

  const papers = papersData?.items || [];

  // Fetch questions for each paper
  const questionsQueries = useQueries({
    queries: papers.map((paper) => ({
      queryKey: queryKeys.assessmentQuestions.byPaperId(paper.id),
      queryFn: () => assessmentQuestionService.getAssessmentQuestions({
        assessmentPaperId: paper.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: papers.length > 0 && visible,
    })),
  });

  const questions = useMemo(() => {
    const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
    questionsQueries.forEach((query, index) => {
      if (query.data?.items && papers[index]) {
        questionsMap[papers[index].id] = query.data.items.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
      }
    });
    return questionsMap;
  }, [questionsQueries, papers]);

  // Fetch rubrics for each question
  const allQuestions = useMemo(() => {
    const questions: AssessmentQuestion[] = [];
    questionsQueries.forEach((query) => {
      if (query.data?.items) {
        questions.push(...query.data.items);
      }
    });
    return questions;
  }, [questionsQueries]);

  const rubricsQueries = useQueries({
    queries: allQuestions.map((question) => ({
      queryKey: queryKeys.rubricItems.byQuestionId(question.id),
      queryFn: () => rubricItemService.getRubricsForQuestion({
        assessmentQuestionId: question.id,
        pageNumber: 1,
        pageSize: 100,
      }),
      enabled: allQuestions.length > 0 && visible,
    })),
  });

  const rubrics = useMemo(() => {
    const rubricsMap: { [questionId: number]: RubricItem[] } = {};
    allQuestions.forEach((question, index) => {
      if (rubricsQueries[index]?.data?.items) {
        rubricsMap[question.id] = rubricsQueries[index].data!.items;
      }
    });
    return rubricsMap;
  }, [allQuestions, rubricsQueries]);

  const loading = useMemo(() => {
    return (
      (!!submission?.gradingGroupId && !gradingGroupsData) ||
      (!!submission?.classAssessmentId && !classAssessmentsData) ||
      (!!assessmentTemplateId && !papersData) ||
      questionsQueries.some(q => q.isLoading) ||
      rubricsQueries.some(q => q.isLoading)
    );
  }, [submission, gradingGroupsData, classAssessmentsData, assessmentTemplateId, papersData, questionsQueries, rubricsQueries]);

  return (
    <Modal
      title="View Exam"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      style={{ top: 20 }}
    >
      <Spin spinning={loading}>
        {!assessmentTemplateId ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">Cannot find assessment template</Text>
          </div>
        ) : (
          <div>
            <Divider />

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
                      <Text>{question.questionText}</Text>

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

                      {rubrics[question.id] && rubrics[question.id].length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <Text strong>Grading Criteria:</Text>
                          <ul>
                            {rubrics[question.id].map((rubric) => (
                              <li key={rubric.id}>
                                {rubric.description} (Max: {rubric.score} points)
                                {rubric.input && rubric.input !== "N/A" && (
                                  <div style={{ marginLeft: 20, fontSize: "12px", color: "#666" }}>
                                    Input: <code>{rubric.input}</code>
                                  </div>
                                )}
                                {rubric.output && rubric.output !== "N/A" && (
                                  <div style={{ marginLeft: 20, fontSize: "12px", color: "#666" }}>
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
              ),
            }))}
          />
          </div>
        )}
      </Spin>
    </Modal>
  );
}

// GradingHistoryModal and FeedbackHistoryModal - copy from lecturer version
// (I'll include simplified versions)

function GradingHistoryModal({
  visible,
  onClose,
  submissionId,
}: {
  visible: boolean;
  onClose: () => void;
  submissionId: number | null;
}) {
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  // Fetch grading history
  const { data: gradingSessionsData, isLoading: loadingGradingHistory } = useQuery({
    queryKey: queryKeys.grading.sessions.list({ submissionId: submissionId!, pageNumber: 1, pageSize: 1000 }),
    queryFn: () => gradingService.getGradingSessions({
      submissionId: submissionId!,
      pageNumber: 1,
      pageSize: 1000,
    }),
    enabled: !!submissionId && visible,
  });

  const gradingHistory = useMemo(() => {
    if (!gradingSessionsData?.items) return [];
    return [...gradingSessionsData.items].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [gradingSessionsData]);

  // Fetch grade items for expanded sessions
  const expandedSessionIds = Array.from(expandedSessions);
  const gradeItemsQueries = useQueries({
    queries: expandedSessionIds.map((sessionId) => ({
      queryKey: ['gradeItems', 'byGradingSessionId', sessionId],
      queryFn: () => gradeItemService.getGradeItems({
        gradingSessionId: sessionId,
        pageNumber: 1,
        pageSize: 1000,
      }),
      enabled: expandedSessionIds.length > 0 && visible,
    })),
  });

  const sessionGradeItems = useMemo(() => {
    const map: { [sessionId: number]: GradeItem[] } = {};
    expandedSessionIds.forEach((sessionId, index) => {
      if (gradeItemsQueries[index]?.data?.items) {
        map[sessionId] = gradeItemsQueries[index].data!.items;
      }
    });
    return map;
  }, [expandedSessionIds, gradeItemsQueries]);

  const getGradingTypeLabel = (type: number) => {
    switch (type) {
      case 0: return "AI";
      case 1: return "LECTURER";
      case 2: return "BOTH";
      default: return "UNKNOWN";
    }
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0: return <Tag color="processing">PROCESSING</Tag>;
      case 1: return <Tag color="success">COMPLETED</Tag>;
      case 2: return <Tag color="error">FAILED</Tag>;
      default: return <Tag>UNKNOWN</Tag>;
    }
  };

  const handleExpandSession = (sessionId: number) => {
    const newExpanded = new Set(expandedSessions);
    const isCurrentlyExpanded = newExpanded.has(sessionId);
    
    if (isCurrentlyExpanded) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  return (
    <Modal
      title="Grading History"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={1000}
    >
      <Spin spinning={loadingGradingHistory}>
        {gradingHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">No grading history available</Text>
          </div>
        ) : (
          <Collapse
            items={gradingHistory.map((session) => {
              const isExpanded = expandedSessions.has(session.id);
              const gradeItems = sessionGradeItems[session.id] || [];
              
              const totalScore = gradeItems.reduce((sum, item) => sum + item.score, 0);

              return {
                key: session.id.toString(),
                label: (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <div>
                      <Text strong>Session #{session.id}</Text>
                      <Space style={{ marginLeft: 16 }}>
                        {getStatusLabel(session.status)}
                        <Tag>{getGradingTypeLabel(session.gradingType)}</Tag>
                        <Tag color="blue">Grade: {session.grade}</Tag>
                        {gradeItems.length > 0 && (
                          <Tag color="green">Total: {totalScore.toFixed(2)}</Tag>
                        )}
                      </Space>
                    </div>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {toVietnamTime(session.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                    </Text>
                  </div>
                ),
                children: (
                  <div>
                    <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                      <Descriptions.Item label="Grading Session ID">{session.id}</Descriptions.Item>
                      <Descriptions.Item label="Status">{getStatusLabel(session.status)}</Descriptions.Item>
                      <Descriptions.Item label="Grading Type">
                        <Tag>{getGradingTypeLabel(session.gradingType)}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Grade">{session.grade}</Descriptions.Item>
                      <Descriptions.Item label="Grade Item Count">{session.gradeItemCount}</Descriptions.Item>
                      <Descriptions.Item label="Created At">
                        {toVietnamTime(session.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Descriptions.Item>
                      <Descriptions.Item label="Updated At">
                        {toVietnamTime(session.updatedAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Descriptions.Item>
                    </Descriptions>

                    {!isExpanded ? (
                      <Button
                        type="link"
                        onClick={() => handleExpandSession(session.id)}
                        style={{ padding: 0 }}
                      >
                        View grade items details
                      </Button>
                    ) : (
                      <div>
                        <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>
                          Grade Items ({gradeItems.length})
                        </Title>
                        {gradeItems.length === 0 ? (
                          <Text type="secondary">No grade items</Text>
                        ) : (
                          <Table
                            columns={[
                              { title: "ID", dataIndex: "id", key: "id" },
                              { title: "Rubric Item ID", dataIndex: "rubricItemId", key: "rubricItemId" },
                              { title: "Score", dataIndex: "score", key: "score" },
                              { title: "Comments", dataIndex: "comments", key: "comments", ellipsis: true },
                            ]}
                            dataSource={gradeItems}
                            rowKey="id"
                            pagination={false}
                            size="small"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        )}
      </Spin>
    </Modal>
  );
}

function FeedbackHistoryModal({
  visible,
  onClose,
  submissionId,
}: {
  visible: boolean;
  onClose: () => void;
  submissionId: number | null;
}) {
  const [expandedFeedbacks, setExpandedFeedbacks] = useState<Set<number>>(new Set());

  // Fetch feedback history
  const { data: feedbackListData, isLoading: loadingFeedbackHistory } = useQuery({
    queryKey: ['submissionFeedback', 'bySubmissionId', submissionId],
    queryFn: () => submissionFeedbackService.getSubmissionFeedbackList({
      submissionId: submissionId!,
    }),
    enabled: !!submissionId && visible,
  });

  const feedbackHistory = useMemo(() => {
    if (!feedbackListData) return [];
    return [...feedbackListData].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [feedbackListData]);

  const deserializeFeedback = (feedbackText: string): FeedbackData | null => {
    if (!feedbackText || feedbackText.trim() === "") {
      return null;
    }

    try {
      const parsed = JSON.parse(feedbackText);
      if (typeof parsed === "object" && parsed !== null) {
        return {
          overallFeedback: parsed.overallFeedback || "",
          strengths: parsed.strengths || "",
          weaknesses: parsed.weaknesses || "",
          codeQuality: parsed.codeQuality || "",
          algorithmEfficiency: parsed.algorithmEfficiency || "",
          suggestionsForImprovement: parsed.suggestionsForImprovement || "",
          bestPractices: parsed.bestPractices || "",
          errorHandling: parsed.errorHandling || "",
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleExpandFeedback = (feedbackId: number) => {
    const newExpanded = new Set(expandedFeedbacks);
    const isCurrentlyExpanded = newExpanded.has(feedbackId);
    
    if (isCurrentlyExpanded) {
      newExpanded.delete(feedbackId);
    } else {
      newExpanded.add(feedbackId);
    }
    
    setExpandedFeedbacks(newExpanded);
  };

  const renderFeedbackFields = (feedbackData: FeedbackData) => {
    const fields: Array<{ key: keyof FeedbackData; label: string }> = [
      { key: "overallFeedback", label: "Overall Feedback" },
      { key: "strengths", label: "Strengths" },
      { key: "weaknesses", label: "Weaknesses" },
      { key: "codeQuality", label: "Code Quality" },
      { key: "algorithmEfficiency", label: "Algorithm Efficiency" },
      { key: "suggestionsForImprovement", label: "Suggestions for Improvement" },
      { key: "bestPractices", label: "Best Practices" },
      { key: "errorHandling", label: "Error Handling" },
    ];

    return fields.map((field) => {
      const value = feedbackData[field.key] || "";
      if (!value) return null;

      return (
        <div key={field.key} style={{ marginBottom: 16 }}>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            {field.label}:
          </Text>
          <TextArea
            value={value}
            readOnly
            rows={value.split("\n").length + 1}
            style={{ backgroundColor: "#f5f5f5" }}
          />
        </div>
      );
    });
  };

  return (
    <Modal
      title="Feedback History"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={1000}
    >
      <Spin spinning={loadingFeedbackHistory}>
        {feedbackHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">No feedback history available</Text>
          </div>
        ) : (
          <Collapse
            items={feedbackHistory.map((feedback) => {
              const isExpanded = expandedFeedbacks.has(feedback.id);
              const parsedFeedback = deserializeFeedback(feedback.feedbackText);
              const isPlainText = parsedFeedback === null;

              return {
                key: feedback.id.toString(),
                label: (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <div>
                      <Text strong>Feedback #{feedback.id}</Text>
                      <Space style={{ marginLeft: 16 }}>
                        {isPlainText ? (
                          <Tag color="orange">Plain Text</Tag>
                        ) : (
                          <Tag color="green">Structured</Tag>
                        )}
                      </Space>
                    </div>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      {toVietnamTime(feedback.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                    </Text>
                  </div>
                ),
                children: (
                  <div>
                    <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                      <Descriptions.Item label="Feedback ID">{feedback.id}</Descriptions.Item>
                      <Descriptions.Item label="Submission ID">{feedback.submissionId}</Descriptions.Item>
                      <Descriptions.Item label="Created At" span={2}>
                        {toVietnamTime(feedback.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Descriptions.Item>
                      <Descriptions.Item label="Updated At" span={2}>
                        {toVietnamTime(feedback.updatedAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Descriptions.Item>
                    </Descriptions>

                    {isPlainText ? (
                      <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>
                          Feedback Content:
                        </Text>
                        <TextArea
                          value={feedback.feedbackText}
                          readOnly
                          rows={feedback.feedbackText.split("\n").length + 3}
                          style={{ backgroundColor: "#f5f5f5", fontFamily: "monospace" }}
                        />
                      </div>
                    ) : (
                      <div>
                        <Title level={5} style={{ marginTop: 16, marginBottom: 16 }}>
                          Feedback Details
                        </Title>
                        {renderFeedbackFields(parsedFeedback!)}
                      </div>
                    )}
                  </div>
                ),
              };
            })}
          />
        )}
      </Spin>
    </Modal>
  );
}

