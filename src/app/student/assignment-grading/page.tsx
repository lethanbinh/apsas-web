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
import { ReactNode, useEffect, useState } from "react";
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
  const [submissionId, setSubmissionId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<QuestionWithRubrics[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [viewExamModalVisible, setViewExamModalVisible] = useState(false);
  const [gradingHistoryModalVisible, setGradingHistoryModalVisible] = useState(false);
  const [feedbackHistoryModalVisible, setFeedbackHistoryModalVisible] = useState(false);
  const [latestGradingSession, setLatestGradingSession] = useState<GradingSession | null>(null);
  const [latestGradeItems, setLatestGradeItems] = useState<GradeItem[]>([]);
  const [gradingHistory, setGradingHistory] = useState<GradingSession[]>([]);
  const [loadingGradingHistory, setLoadingGradingHistory] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<SubmissionFeedback[]>([]);
  const [loadingFeedbackHistory, setLoadingFeedbackHistory] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData>({
    overallFeedback: "",
    strengths: "",
    weaknesses: "",
    codeQuality: "",
    algorithmEfficiency: "",
    suggestionsForImprovement: "",
    bestPractices: "",
    errorHandling: "",
  });

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

  useEffect(() => {
    if (submissionId) {
      fetchData();
    }
  }, [submissionId]);

  const fetchData = async () => {
    let currentSubmissionId: number | null = null;
    
    try {
      setLoading(true);

      // Fetch submission by ID
      let sub: Submission | null = null;
      
      // Try to fetch from classAssessment first
      const classId = localStorage.getItem("selectedClassId");
      if (classId) {
        try {
          const classAssessmentsRes = await classAssessmentService.getClassAssessments({
            classId: Number(classId),
            pageNumber: 1,
            pageSize: 1000,
          });

          for (const classAssessment of classAssessmentsRes.items) {
            const submissions = await submissionService.getSubmissionList({
              classAssessmentId: classAssessment.id,
            });
            const found = submissions.find((s) => s.id === submissionId);
            if (found) {
              sub = found;
              break;
            }
          }
        } catch (err) {
          console.error("Failed to fetch from classAssessment:", err);
        }
      }

      // If not found, try examSession
      if (!sub) {
        try {
          const allSubmissions = await submissionService.getSubmissionList({});
          sub = allSubmissions.find((s) => s.id === submissionId) || null;
        } catch (err) {
          console.error("Failed to fetch submission:", err);
        }
      }

      if (!sub) {
        message.error("Submission not found");
        router.back();
        return;
      }

      currentSubmissionId = sub.id;
      setSubmission(sub);

      // Fetch questions and rubrics
      await fetchQuestionsAndRubrics(sub);
      
      // Fetch latest grading session and grade items
      await fetchLatestGradingData(sub.id);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      message.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
      // Fetch feedback independently after main data is loaded
      if (currentSubmissionId) {
        fetchFeedback(currentSubmissionId);
      }
    }
  };

  const fetchLatestGradingData = async (submissionId: number) => {
    try {
      // Fetch latest grading session for this submission
      const gradingSessionsResult = await gradingService.getGradingSessions({
        submissionId: submissionId,
        pageNumber: 1,
        pageSize: 100,
      });

      if (gradingSessionsResult.items.length > 0) {
        // Sort by createdAt desc to get the latest session
        const sortedSessions = [...gradingSessionsResult.items].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        const latestSession = sortedSessions[0];
        setLatestGradingSession(latestSession);
        
        // Fetch grade items for this grading session
        const gradeItemsResult = await gradeItemService.getGradeItems({
          gradingSessionId: latestSession.id,
          pageNumber: 1,
          pageSize: 1000,
        });
        
        const allGradeItems = gradeItemsResult.items;
        setLatestGradeItems(allGradeItems);
        
        // Filter to get only the latest grade item for each rubricItemId
        const sortedItems = [...allGradeItems].sort((a, b) => {
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
        
        // Map grade items to rubric scores and comments
        if (latestGradeItemsForDisplay.length > 0) {
          setQuestions((prevQuestions) => {
            return prevQuestions.map((question) => {
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
                rubricComments: newRubricComments
              };
            });
          });
        }
        
        // Calculate total score from ALL grade items
        if (allGradeItems.length > 0) {
          const total = allGradeItems.reduce((sum, item) => sum + item.score, 0);
          setTotalScore(total);
        } else {
          setTotalScore(latestSession.grade);
        }
      }
    } catch (err: any) {
      console.error("Failed to fetch latest grading data:", err);
    }
  };

  const fetchQuestionsAndRubrics = async (submission: Submission) => {
    const allQuestions: QuestionWithRubrics[] = [];
    
    try {
      let assessmentTemplateId: number | null = null;

      // Try to get assessmentTemplateId from gradingGroupId first
      if (submission.gradingGroupId) {
        try {
          const { gradingGroupService } = await import("@/services/gradingGroupService");
          const gradingGroups = await gradingGroupService.getGradingGroups({});
          const gradingGroup = gradingGroups.find((gg) => gg.id === submission.gradingGroupId);
          if (gradingGroup?.assessmentTemplateId) {
            assessmentTemplateId = gradingGroup.assessmentTemplateId;
          }
        } catch (err) {
          console.error("Failed to fetch from gradingGroup:", err);
        }
      }

      // Try to get assessmentTemplateId from classAssessmentId
      if (!assessmentTemplateId && submission.classAssessmentId) {
        try {
          const classId = localStorage.getItem("selectedClassId");
          if (classId) {
            const classAssessmentsRes = await classAssessmentService.getClassAssessments({
              classId: Number(classId),
              pageNumber: 1,
              pageSize: 1000,
            });
            const classAssessment = classAssessmentsRes.items.find(
              (ca) => ca.id === submission.classAssessmentId
            );
            if (classAssessment?.assessmentTemplateId) {
              assessmentTemplateId = classAssessment.assessmentTemplateId;
            }
          }
        } catch (err) {
          console.error("Failed to fetch from classAssessment:", err);
        }
      }

      if (!assessmentTemplateId) {
        console.warn("Could not find assessmentTemplateId for submission:", submission.id);
        setQuestions([]);
        return;
      }

      // Fetch template
      const templates = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      const template = templates.items.find((t) => t.id === assessmentTemplateId);

      if (!template) {
        setQuestions([]);
        return;
      }

      // Fetch papers
      let papersData;
      try {
        const papers = await assessmentPaperService.getAssessmentPapers({
          assessmentTemplateId: template.id,
          pageNumber: 1,
          pageSize: 100,
        });
        papersData = papers.items.length > 0 ? papers.items : null;
      } catch (err) {
        console.error("Failed to fetch papers:", err);
        papersData = null;
      }

      if (!papersData || papersData.length === 0) {
        setQuestions([]);
        return;
      }

      for (const paper of papersData) {
        try {
          const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
            assessmentPaperId: paper.id,
            pageNumber: 1,
            pageSize: 100,
          });
          const paperQuestions = questionsRes.items.length > 0
            ? [...questionsRes.items].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0))
            : [];

          for (const question of paperQuestions) {
            try {
              const rubricsRes = await rubricItemService.getRubricsForQuestion({
                assessmentQuestionId: question.id,
                pageNumber: 1,
                pageSize: 100,
              });
              const rubrics = rubricsRes.items.length > 0 ? rubricsRes.items : [];

              allQuestions.push({
                ...question,
                rubrics,
                rubricScores: {},
                rubricComments: {},
              });
            } catch (err) {
              console.error(`Failed to fetch rubrics for question ${question.id}:`, err);
              allQuestions.push({
                ...question,
                rubrics: [],
                rubricScores: {},
                rubricComments: {},
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch questions for paper ${paper.id}:`, err);
        }
      }

      setQuestions(allQuestions);
    } catch (err: any) {
      console.error("Failed to fetch questions and rubrics:", err);
      setQuestions([]);
    }
  };

  const fetchFeedback = async (submissionId: number) => {
    try {
      setLoadingFeedback(true);
      const feedbackList = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submissionId,
      });
      
      if (feedbackList.length > 0) {
        const existingFeedback = feedbackList[0];
        
        let parsedFeedback: FeedbackData | null = deserializeFeedback(existingFeedback.feedbackText);
        
        if (parsedFeedback === null) {
          try {
            parsedFeedback = await geminiService.formatFeedback(existingFeedback.feedbackText);
          } catch (error: any) {
            console.error("Failed to parse feedback with Gemini:", error);
            parsedFeedback = {
              overallFeedback: existingFeedback.feedbackText,
              strengths: "",
              weaknesses: "",
              codeQuality: "",
              algorithmEfficiency: "",
              suggestionsForImprovement: "",
              bestPractices: "",
              errorHandling: "",
            };
          }
        }
        
        if (parsedFeedback) {
          setFeedback(parsedFeedback);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch feedback:", error);
    } finally {
      setLoadingFeedback(false);
    }
  };

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

  const handleOpenGradingHistory = async () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }

    setGradingHistoryModalVisible(true);
    await fetchGradingHistory();
  };

  const handleOpenFeedbackHistory = async () => {
    if (!submissionId) {
      message.error("No submission selected");
      return;
    }

    setFeedbackHistoryModalVisible(true);
    await fetchFeedbackHistory();
  };

  const fetchFeedbackHistory = async () => {
    if (!submissionId) {
      return;
    }

    try {
      setLoadingFeedbackHistory(true);
      const feedbackList = await submissionFeedbackService.getSubmissionFeedbackList({
        submissionId: submissionId,
      });
      
      const sortedHistory = [...feedbackList].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      setFeedbackHistory(sortedHistory);
    } catch (err: any) {
      console.error("Failed to fetch feedback history:", err);
      setFeedbackHistory([]);
    } finally {
      setLoadingFeedbackHistory(false);
    }
  };

  const fetchGradingHistory = async () => {
    if (!submissionId) {
      return;
    }

    try {
      setLoadingGradingHistory(true);
      const result = await gradingService.getGradingSessions({
        submissionId: submissionId,
        pageNumber: 1,
        pageSize: 1000,
      });
      
      if (result && result.items && result.items.length > 0) {
        const sortedHistory = [...result.items].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        
        setGradingHistory(sortedHistory);
      } else {
        setGradingHistory([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch grading history:", err);
      setGradingHistory([]);
    } finally {
      setLoadingGradingHistory(false);
    }
  };

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

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (!submission) {
    return null;
  }

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
              <Descriptions.Item label="Submission ID">{submission.id}</Descriptions.Item>
              <Descriptions.Item label="Student Code">
                {submission.studentCode}
              </Descriptions.Item>
              <Descriptions.Item label="Student Name">
                {submission.studentName}
              </Descriptions.Item>
              <Descriptions.Item label="Submitted At">
                {submission.submittedAt
                  ? toVietnamTime(submission.submittedAt).format("DD/MM/YYYY HH:mm:ss")
                  : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Submission File">
                {submission.submissionFile?.name || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Total Score">
                <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
                  {totalScore.toFixed(2)}/{questions.reduce((sum, q) => {
                    return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
                  }, 0).toFixed(2)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Space>
        </Card>

        <Card className={styles.feedbackCard} style={{ marginTop: 24 }}>
          <Spin spinning={loadingFeedback}>
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
          </Spin>
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
                            Total Questions: {questions.length}
                          </Text>
                          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                            Total Max Score: {questions.reduce((sum, q) => {
                              return sum + q.rubrics.reduce((rubricSum, rubric) => rubricSum + rubric.score, 0);
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
                          const sortedQuestions = [...questions].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));

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
          gradingHistory={gradingHistory}
          loading={loadingGradingHistory}
          submissionId={submissionId}
        />

        <FeedbackHistoryModal
          visible={feedbackHistoryModalVisible}
          onClose={() => setFeedbackHistoryModalVisible(false)}
          feedbackHistory={feedbackHistory}
          loading={loadingFeedbackHistory}
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
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<{ [paperId: number]: AssessmentQuestion[] }>({});
  const [rubrics, setRubrics] = useState<{ [questionId: number]: RubricItem[] }>({});

  useEffect(() => {
    if (visible && submission) {
      fetchExamData();
    }
  }, [visible, submission]);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      let assessmentTemplateId: number | null = null;

      if (submission?.gradingGroupId) {
        try {
          const { gradingGroupService } = await import("@/services/gradingGroupService");
          const gradingGroups = await gradingGroupService.getGradingGroups({});
          const gradingGroup = gradingGroups.find((gg) => gg.id === submission.gradingGroupId);
          if (gradingGroup?.assessmentTemplateId) {
            assessmentTemplateId = gradingGroup.assessmentTemplateId;
          }
        } catch (err) {
          console.error("Failed to fetch from gradingGroup:", err);
        }
      }

      if (!assessmentTemplateId && submission?.classAssessmentId) {
        try {
          const classId = localStorage.getItem("selectedClassId");
          if (classId) {
            const classAssessmentsRes = await classAssessmentService.getClassAssessments({
              classId: Number(classId),
              pageNumber: 1,
              pageSize: 1000,
            });
            const classAssessment = classAssessmentsRes.items.find(
              (ca) => ca.id === submission.classAssessmentId
            );
            if (classAssessment?.assessmentTemplateId) {
              assessmentTemplateId = classAssessment.assessmentTemplateId;
            }
          }
        } catch (err) {
          console.error("Failed to fetch from classAssessment:", err);
        }
      }

      if (!assessmentTemplateId) {
        message.error("Cannot find assessment template");
        return;
      }

      const papersRes = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: assessmentTemplateId,
        pageNumber: 1,
        pageSize: 100,
      });

      const papersData = papersRes.items.length > 0 ? papersRes.items : [];
      setPapers(papersData);

      const questionsMap: { [paperId: number]: AssessmentQuestion[] } = {};
      for (const paper of papersData) {
        const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
          assessmentPaperId: paper.id,
          pageNumber: 1,
          pageSize: 100,
        });

        const paperQuestions = questionsRes.items.length > 0
          ? [...questionsRes.items].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0))
          : [];

        questionsMap[paper.id] = paperQuestions;

        const rubricsMap: { [questionId: number]: RubricItem[] } = {};
        for (const question of paperQuestions) {
          const rubricsRes = await rubricItemService.getRubricsForQuestion({
            assessmentQuestionId: question.id,
            pageNumber: 1,
            pageSize: 100,
          });

          rubricsMap[question.id] = rubricsRes.items.length > 0 ? rubricsRes.items : [];
        }
        setRubrics((prev) => ({ ...prev, ...rubricsMap }));
      }
      setQuestions(questionsMap);
    } catch (err: any) {
      console.error("Failed to fetch exam data:", err);
      message.error("Failed to load exam data");
    } finally {
      setLoading(false);
    }
  };

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
      </Spin>
    </Modal>
  );
}

// GradingHistoryModal and FeedbackHistoryModal - copy from lecturer version
// (I'll include simplified versions)

function GradingHistoryModal({
  visible,
  onClose,
  gradingHistory,
  loading,
  submissionId,
}: {
  visible: boolean;
  onClose: () => void;
  gradingHistory: GradingSession[];
  loading: boolean;
  submissionId: number | null;
}) {
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [sessionGradeItems, setSessionGradeItems] = useState<{ [sessionId: number]: GradeItem[] }>({});

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

  const handleExpandSession = async (sessionId: number) => {
    const newExpanded = new Set(expandedSessions);
    const isCurrentlyExpanded = newExpanded.has(sessionId);
    
    if (isCurrentlyExpanded) {
      newExpanded.delete(sessionId);
      setExpandedSessions(newExpanded);
      return;
    }

    if (sessionGradeItems[sessionId]) {
      newExpanded.add(sessionId);
      setExpandedSessions(newExpanded);
      return;
    }

    try {
      const gradeItems = await gradeItemService.getGradeItems({
        gradingSessionId: sessionId,
        pageNumber: 1,
        pageSize: 1000,
      });
      
      setSessionGradeItems((prev) => ({
        ...prev,
        [sessionId]: gradeItems.items,
      }));
      newExpanded.add(sessionId);
      setExpandedSessions(newExpanded);
    } catch (err: any) {
      console.error("Failed to fetch grade items:", err);
    }
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
      <Spin spinning={loading}>
        {gradingHistory.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">No grading history available</Text>
          </div>
        ) : (
          <Collapse
            items={gradingHistory.map((session) => {
              const isExpanded = expandedSessions.has(session.id);
              const gradeItems = sessionGradeItems[session.id] || [];

              return {
                key: session.id.toString(),
                label: (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <div>
                      <Text strong>Session #{session.id}</Text>
                      <Space style={{ marginLeft: 16 }}>
                        <Tag>{getGradingTypeLabel(session.gradingType)}</Tag>
                        {getStatusLabel(session.status)}
                        <Tag color="blue">Grade: {session.grade}/100</Tag>
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
                      <Descriptions.Item label="Session ID">{session.id}</Descriptions.Item>
                      <Descriptions.Item label="Grade">{session.grade}/100</Descriptions.Item>
                      <Descriptions.Item label="Type">{getGradingTypeLabel(session.gradingType)}</Descriptions.Item>
                      <Descriptions.Item label="Status">{getStatusLabel(session.status)}</Descriptions.Item>
                      <Descriptions.Item label="Created At" span={2}>
                        {toVietnamTime(session.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Descriptions.Item>
                    </Descriptions>

                    {gradeItems.length > 0 && (
                      <div>
                        <Title level={5}>Grade Items ({gradeItems.length})</Title>
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
  feedbackHistory,
  loading,
  submissionId,
}: {
  visible: boolean;
  onClose: () => void;
  feedbackHistory: SubmissionFeedback[];
  loading: boolean;
  submissionId: number | null;
}) {
  const [expandedFeedbacks, setExpandedFeedbacks] = useState<Set<number>>(new Set());

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
      <Spin spinning={loading}>
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

