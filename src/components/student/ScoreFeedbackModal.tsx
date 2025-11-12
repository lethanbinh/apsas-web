"use client";

import React, { useState, useEffect } from "react";
import { Modal, Typography, Card, Descriptions, Space, Divider, Collapse, Tag, Row, Col, Button, Spin, Table, Input } from "antd";
import styles from "./ScoreFeedbackModal.module.css";
import { AssignmentData } from "./data";
import { CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { submissionService, Submission } from "@/services/submissionService";
import { useStudent } from "@/hooks/useStudent";
import { classAssessmentService } from "@/services/classAssessmentService";
import { assessmentTemplateService } from "@/services/assessmentTemplateService";
import { assessmentPaperService } from "@/services/assessmentPaperService";
import { assessmentQuestionService, AssessmentQuestion } from "@/services/assessmentQuestionService";
import { rubricItemService, RubricItem } from "@/services/rubricItemService";
import type { ColumnsType } from "antd/es/table";

dayjs.extend(utc);
dayjs.extend(timezone);

const { Title, Text } = Typography;
const { TextArea } = Input;

interface QuestionWithRubrics extends AssessmentQuestion {
  rubrics: RubricItem[];
  rubricScores: { [rubricId: number]: number };
}

// Helper function to convert UTC to Vietnam time (UTC+7)
const toVietnamTime = (dateString: string) => {
  return dayjs.utc(dateString).tz("Asia/Ho_Chi_Minh");
};

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
  const { studentId } = useStudent();
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Initialize with sample feedback data
  const defaultSampleFeedback = {
    overallFeedback: "The submission demonstrates a good understanding of the problem requirements. The code is functional and produces correct outputs for the given test cases. However, there are areas for improvement in code structure and efficiency.",
    strengths: "1. Correct output for all test cases\n2. Code is readable and well-formatted\n3. Basic logic is sound\n4. Variable naming is clear",
    weaknesses: "1. Code could be more modular with better function separation\n2. Some redundant code that could be refactored\n3. Limited error handling\n4. Missing input validation in some areas",
    codeQuality: "The code quality is acceptable but could be improved. The structure is straightforward but lacks modularity. Consider breaking down complex functions into smaller, reusable components. Code formatting is consistent, which is good.",
    algorithmEfficiency: "The algorithm works correctly but may not be optimal for larger inputs. Time complexity could be improved in some sections. Consider using more efficient data structures where applicable.",
    suggestionsForImprovement: "1. Refactor code into smaller, reusable functions\n2. Add input validation and error handling\n3. Optimize algorithms for better time complexity\n4. Add comprehensive code comments\n5. Consider edge cases more thoroughly",
    bestPractices: "Follow coding best practices such as DRY (Don't Repeat Yourself) principle. Use meaningful variable names consistently. Consider using constants for magic numbers. Implement proper error handling mechanisms.",
    errorHandling: "Error handling is minimal. Add try-catch blocks where necessary. Validate user inputs before processing. Provide meaningful error messages to help with debugging.",
  };
  
  const [feedback, setFeedback] = useState<any>(defaultSampleFeedback);
  const [questions, setQuestions] = useState<QuestionWithRubrics[]>([]);

  useEffect(() => {
    if (open) {
      // Always initialize with sample data first
      createSampleFeedback();
      createSampleQuestionsForNoSubmission();
      
      // Then try to fetch real data if available
      if (studentId && data.classAssessmentId) {
        fetchSubmissionData();
      }
    }
  }, [open, studentId, data.classAssessmentId]);

  const fetchSubmissionData = async () => {
    try {
      setLoading(true);
      if (!studentId) {
        // Create sample data even without studentId
        createSampleFeedback();
        createSampleQuestionsForNoSubmission();
        return;
      }
      
      const submissions = await submissionService.getSubmissionList({
        studentId: studentId,
        classAssessmentId: data.classAssessmentId ?? undefined,
      });

      if (submissions.length > 0) {
        const latest = submissions[0];
        setLastSubmission(latest);

        // Load feedback from localStorage
        const savedFeedback = localStorage.getItem(`feedback_${latest.id}`);
        if (savedFeedback) {
          setFeedback(JSON.parse(savedFeedback));
        } else {
          // Always create sample feedback if not found
          createSampleFeedback();
        }

        // Fetch questions and rubrics
        await fetchQuestionsAndRubrics(latest);
      } else {
        // No submissions found, create sample data
        createSampleFeedback();
        createSampleQuestionsForNoSubmission();
      }
    } catch (err) {
      console.error("Failed to fetch submission:", err);
      // On error, still show sample data
      createSampleFeedback();
      createSampleQuestionsForNoSubmission();
    } finally {
      setLoading(false);
    }
  };

  const createSampleFeedback = () => {
    setFeedback(defaultSampleFeedback);
  };

  const createSampleQuestionsForNoSubmission = () => {
    const sampleQuestions: QuestionWithRubrics[] = [
      {
        id: 1,
        questionNumber: 1,
        questionText: "Sample Question 1: Write a program to calculate the sum of two numbers",
        questionSampleInput: "5\n10",
        questionSampleOutput: "15",
        score: 10,
        assessmentPaperId: 1,
        assessmentPaperName: "Sample Paper 1",
        rubricCount: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rubrics: [
          {
            id: 1,
            description: "Correct output for sample input",
            input: "5\n10",
            output: "15",
            score: 5,
            assessmentQuestionId: 1,
            questionText: "Sample Question 1",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 2,
            description: "Code structure and readability",
            input: "N/A",
            output: "N/A",
            score: 5,
            assessmentQuestionId: 1,
            questionText: "Sample Question 1",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        rubricScores: { 1: 5, 2: 4 },
      },
      {
        id: 2,
        questionNumber: 2,
        questionText: "Sample Question 2: Write a program to find the maximum of three numbers",
        questionSampleInput: "3\n7\n2",
        questionSampleOutput: "7",
        score: 10,
        assessmentPaperId: 1,
        assessmentPaperName: "Sample Paper 1",
        rubricCount: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rubrics: [
          {
            id: 3,
            description: "Correct output for sample input",
            input: "3\n7\n2",
            output: "7",
            score: 6,
            assessmentQuestionId: 2,
            questionText: "Sample Question 2",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 4,
            description: "Code structure and readability",
            input: "N/A",
            output: "N/A",
            score: 4,
            assessmentQuestionId: 2,
            questionText: "Sample Question 2",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        rubricScores: { 3: 6, 4: 3 },
      },
    ];
    setQuestions(sampleQuestions);
  };

  const fetchQuestionsAndRubrics = async (submission: Submission) => {
    try {
      let assessmentTemplateId: number | null = null;

      // Try to get assessmentTemplateId from gradingGroupId first
      if (submission.gradingGroupId) {
        // For PE grading, we would fetch grading group, but for student assignment, we use classAssessmentId
        // Skip this for now as student assignments use classAssessmentId
      }

      // Get assessmentTemplateId from classAssessmentId
      if (data.classAssessmentId && data.classId) {
        const classAssessmentsRes = await classAssessmentService.getClassAssessments({
          classId: data.classId,
          pageNumber: 1,
          pageSize: 1000,
        });
        const classAssessment = classAssessmentsRes.items.find(
          (ca) => ca.id === data.classAssessmentId
        );
        if (classAssessment?.assessmentTemplateId) {
          assessmentTemplateId = classAssessment.assessmentTemplateId;
        }
      }

      if (!assessmentTemplateId) {
        // Create sample data if no template found
        createSampleQuestions(submission);
        return;
      }

      // Fetch template
      const templates = await assessmentTemplateService.getAssessmentTemplates({
        pageNumber: 1,
        pageSize: 1000,
      });
      const template = templates.items.find((t) => t.id === assessmentTemplateId);

      if (!template) {
        createSampleQuestions(submission);
        return;
      }

      // Fetch papers
      const papers = await assessmentPaperService.getAssessmentPapers({
        assessmentTemplateId: template.id,
        pageNumber: 1,
        pageSize: 100,
      });

      // Fetch questions and rubrics for each paper
      const allQuestions: QuestionWithRubrics[] = [];
      
      const papersData = papers.items.length > 0 
        ? papers.items 
        : [
            {
              id: 1,
              name: "Sample Paper 1",
              description: "Sample paper description",
              assessmentTemplateId: template.id,
            },
          ];

      for (const paper of papersData) {
        const questionsRes = await assessmentQuestionService.getAssessmentQuestions({
          assessmentPaperId: paper.id,
          pageNumber: 1,
          pageSize: 100,
        });

        const paperQuestions = questionsRes.items.length > 0
          ? [...questionsRes.items].sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0))
          : [
              {
                id: 1,
                questionText: "Sample Question: Write a program to calculate the sum of two numbers",
                questionNumber: 1,
                questionSampleInput: "5\n10",
                questionSampleOutput: "15",
                score: 10,
                assessmentPaperId: paper.id,
                assessmentPaperName: paper.name,
                rubricCount: 2,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ];

        for (const question of paperQuestions) {
          const rubricsRes = await rubricItemService.getRubricsForQuestion({
            assessmentQuestionId: question.id,
            pageNumber: 1,
            pageSize: 100,
          });

          const questionRubrics = rubricsRes.items.length > 0
            ? rubricsRes.items
            : [
                {
                  id: 1,
                  description: "Correct output for sample input",
                  input: "5\n10",
                  output: "15",
                  score: 5,
                  assessmentQuestionId: question.id,
                  questionText: question.questionText,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                {
                  id: 2,
                  description: "Code structure and readability",
                  input: "N/A",
                  output: "N/A",
                  score: 5,
                  assessmentQuestionId: question.id,
                  questionText: question.questionText,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ];

          // Generate sample scores based on submission grade
          const hasGrade = submission.lastGrade > 0;
          const rubricScores: { [rubricId: number]: number } = {};
          questionRubrics.forEach((rubric) => {
            if (hasGrade) {
              // If already graded, distribute score proportionally
              const totalMaxScore = questionRubrics.reduce((sum, r) => sum + r.score, 0);
              const questionScore = (submission.lastGrade / 100) * question.score;
              rubricScores[rubric.id] = Math.round((rubric.score / totalMaxScore) * questionScore);
            } else {
              // Generate sample score (random between 60-100% of max score)
              const minScore = Math.floor(rubric.score * 0.6);
              const maxScore = rubric.score;
              const sampleScore = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
              rubricScores[rubric.id] = sampleScore;
            }
          });

          allQuestions.push({
            ...question,
            rubrics: questionRubrics,
            rubricScores,
          });
        }
      }

      if (allQuestions.length === 0) {
        // Always create sample data if no questions found
        createSampleQuestions(submission);
      } else {
        // Sort questions by questionNumber
        const sortedQuestions = [...allQuestions].sort((a, b) => 
          (a.questionNumber || 0) - (b.questionNumber || 0)
        );
        setQuestions(sortedQuestions);
      }
    } catch (err) {
      console.error("Failed to fetch questions and rubrics:", err);
      // Always create sample data on error
      createSampleQuestions(submission);
    }
  };

  const createSampleQuestions = (submission: Submission) => {
    const sampleQuestions: QuestionWithRubrics[] = [
      {
        id: 1,
        questionText: "Sample Question 1: Write a program to calculate the sum of two numbers",
        questionSampleInput: "5\n10",
        questionSampleOutput: "15",
        score: 10,
        questionNumber: 1,
        assessmentPaperId: 1,
        assessmentPaperName: "Sample Paper 1",
        rubricCount: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rubrics: [
          {
            id: 1,
            description: "Correct output for sample input",
            input: "5\n10",
            output: "15",
            score: 5,
            assessmentQuestionId: 1,
            questionText: "Sample Question 1",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 2,
            description: "Code structure and readability",
            input: "N/A",
            output: "N/A",
            score: 5,
            assessmentQuestionId: 1,
            questionText: "Sample Question 1",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        rubricScores: {},
      },
      {
        id: 2,
        questionText: "Sample Question 2: Write a program to find the maximum of three numbers",
        questionSampleInput: "3\n7\n2",
        questionSampleOutput: "7",
        score: 10,
        questionNumber: 2,
        assessmentPaperId: 1,
        assessmentPaperName: "Sample Paper 1",
        rubricCount: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rubrics: [
          {
            id: 3,
            description: "Correct output for sample input",
            input: "3\n7\n2",
            output: "7",
            score: 6,
            assessmentQuestionId: 2,
            questionText: "Sample Question 2",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 4,
            description: "Code structure and readability",
            input: "N/A",
            output: "N/A",
            score: 4,
            assessmentQuestionId: 2,
            questionText: "Sample Question 2",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        rubricScores: {},
      },
    ];

    const hasGrade = submission.lastGrade > 0;
    sampleQuestions.forEach((q) => {
      q.rubrics.forEach((rubric) => {
        if (hasGrade) {
          const totalMaxScore = q.rubrics.reduce((sum, r) => sum + r.score, 0);
          const questionScore = (submission.lastGrade / 100) * q.score;
          q.rubricScores[rubric.id] = Math.round((rubric.score / totalMaxScore) * questionScore);
        } else {
          const minScore = Math.floor(rubric.score * 0.6);
          const maxScore = rubric.score;
          const sampleScore = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
          q.rubricScores[rubric.id] = sampleScore;
        }
      });
    });

    setQuestions(sampleQuestions);
  };

  // Parse score from string like "5/10" to get numeric values
  const parseScore = (scoreStr: string) => {
    if (!scoreStr || scoreStr === "N/A") return { current: 0, max: 100 };
    const match = scoreStr.match(/(\d+)\/(\d+)/);
    if (match) {
      return { current: parseInt(match[1]), max: parseInt(match[2]) };
    }
    return { current: 0, max: 100 };
  };

  const scoreInfo = parseScore(data.totalScore);

  const getQuestionColumns = (question: QuestionWithRubrics): ColumnsType<RubricItem> => [
    {
      title: "Criteria",
      dataIndex: "description",
      key: "description",
      width: "40%",
    },
    {
      title: "Input",
      dataIndex: "input",
      key: "input",
      width: "25%",
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
      width: "25%",
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
      align: "center",
      render: (score: number) => <Tag color="blue">{score}</Tag>,
    },
    {
      title: "Score",
      key: "rubricScore",
      width: "15%",
      render: (_: any, record: RubricItem) => {
        const currentScore = question.rubricScores[record.id] || 0;
        return (
          <Text strong style={{ fontSize: "14px" }}>
            {currentScore}
          </Text>
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
      width={1000}
      style={{ top: 20 }}
      closeIcon={<CloseOutlined />}
    >
      <Spin spinning={loading}>
        <div className={styles.container}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* Submission Information Card */}
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
                  <Text strong style={{ fontSize: "18px", color: "#1890ff" }}>
                    {data.totalScore}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Grading Details Card - Questions and Rubrics */}
            {questions.length > 0 && (
              <Card className={styles.questionsCard}>
                <Title level={3}>Grading Details</Title>
                <Text type="secondary">
                  Total Questions: {questions.length} | Total Max Score:{" "}
                  {questions.reduce((sum, q) => sum + q.score, 0)}
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
                              Score: {questionTotalScore}/{questionMaxScore}
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
                          />
                        </div>
                      ),
                    };
                  })}
                />
              </Card>
            )}

            {/* Fallback to old Grade Criteria Card if no questions */}
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
                            rows={4}
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

            {/* Detailed Feedback Card */}
            <Card className={styles.feedbackCard}>
              <Title level={3}>Detailed Feedback</Title>
              <Text type="secondary">
                Provide comprehensive feedback for the student's submission
              </Text>
              <Divider />

              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                  <Title level={5}>Overall Feedback</Title>
                  <TextArea
                    rows={4}
                    value={feedback?.overallFeedback || data.overallFeedback || defaultSampleFeedback.overallFeedback}
                    readOnly
                    placeholder="No overall feedback provided yet."
                  />
                </div>

                {/* Always show detailed feedback sections - sample data will be shown if no real data */}
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Strengths</Title>
                      <TextArea
                        rows={5}
                        value={feedback?.strengths || defaultSampleFeedback.strengths}
                        readOnly
                        placeholder="List the strengths of the submission..."
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Weaknesses</Title>
                      <TextArea
                        rows={5}
                        value={feedback?.weaknesses || defaultSampleFeedback.weaknesses}
                        readOnly
                        placeholder="List areas that need improvement..."
                      />
                    </div>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Code Quality</Title>
                      <TextArea
                        rows={4}
                        value={feedback?.codeQuality || defaultSampleFeedback.codeQuality}
                        readOnly
                        placeholder="Evaluate code structure, readability, and maintainability..."
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Algorithm Efficiency</Title>
                      <TextArea
                        rows={4}
                        value={feedback?.algorithmEfficiency || defaultSampleFeedback.algorithmEfficiency}
                        readOnly
                        placeholder="Comment on time/space complexity and optimization..."
                      />
                    </div>
                  </Col>
                </Row>

                <div>
                  <Title level={5}>Suggestions for Improvement</Title>
                  <TextArea
                    rows={4}
                    value={feedback?.suggestionsForImprovement || defaultSampleFeedback.suggestionsForImprovement}
                    readOnly
                    placeholder="Provide specific suggestions for improvement..."
                  />
                </div>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Best Practices</Title>
                      <TextArea
                        rows={3}
                        value={feedback?.bestPractices || defaultSampleFeedback.bestPractices}
                        readOnly
                        placeholder="Comment on adherence to coding best practices..."
                      />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div>
                      <Title level={5}>Error Handling</Title>
                      <TextArea
                        rows={3}
                        value={feedback?.errorHandling || defaultSampleFeedback.errorHandling}
                        readOnly
                        placeholder="Evaluate error handling and input validation..."
                      />
                    </div>
                  </Col>
                </Row>

                {/* Fallback to old format if no detailed feedback and old data exists */}
                {!feedback && data.suggestionsAvoid && (
                  <>
                    <div>
                      <Title level={5}>What you should avoid</Title>
                      <TextArea
                        rows={4}
                        value={data.suggestionsAvoid}
                        readOnly
                      />
                    </div>
                    {data.suggestionsImprove && (
                      <div>
                        <Title level={5}>What you should improve</Title>
                        <TextArea
                          rows={4}
                          value={data.suggestionsImprove}
                          readOnly
                        />
                      </div>
                    )}
                  </>
                )}
              </Space>
            </Card>

            {/* Close Button */}
            <div style={{ textAlign: "right", marginTop: 16 }}>
              <Button type="primary" onClick={onCancel}>
                Close
              </Button>
            </div>
          </Space>
        </div>
      </Spin>
    </Modal>
  );
};
